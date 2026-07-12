import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { resolveMaintenanceSchema } from "@/lib/schemas";

/**
 * POST /api/maintenance/[id]/resolve
 * Mark maintenance as COMPLETED.
 * Auto-flips asset back to AVAILABLE.
 * Role: ASSET_MANAGER, ADMIN
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ASSET_MANAGER", "ADMIN"])) {
    return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = resolveMaintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const maintenanceRequest = await db.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: true,
        requestedByUser: { select: { id: true, name: true } },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json(
        { error: "Maintenance request not found" },
        { status: 404 }
      );
    }

    if (!["APPROVED", "IN_PROGRESS"].includes(maintenanceRequest.status)) {
      return NextResponse.json(
        { error: `Cannot resolve a ${maintenanceRequest.status.toLowerCase()} request` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          resolutionNotes: parsed.data.resolutionNotes,
        },
      });

      // Flip asset back to AVAILABLE
      await tx.asset.update({
        where: { id: maintenanceRequest.assetId },
        data: { status: "AVAILABLE" },
      });

      // State history
      await tx.assetStateHistory.create({
        data: {
          assetId: maintenanceRequest.assetId,
          fromStatus: "UNDER_MAINTENANCE",
          toStatus: "AVAILABLE",
          reason: `Maintenance completed: ${parsed.data.resolutionNotes}`,
          changedByUserId: session!.user.id,
        },
      });

      // Notify requester
      await tx.notification.create({
        data: {
          userId: maintenanceRequest.requestedByUserId,
          type: "MAINTENANCE_COMPLETED",
          title: "Maintenance Completed",
          message: `${maintenanceRequest.asset.name} (${maintenanceRequest.asset.assetTag}) maintenance is complete and back in service.`,
          resourceType: "MaintenanceRequest",
          resourceId: id,
        },
      });
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "MAINTENANCE_RESOLVED",
        resourceType: "MaintenanceRequest",
        resourceId: id,
        details: JSON.stringify({
          assetTag: maintenanceRequest.asset.assetTag,
          resolution: parsed.data.resolutionNotes,
        }),
      },
    });

    return NextResponse.json({
      message: "Maintenance completed, asset is now AVAILABLE",
    });
  } catch (err) {
    console.error("Maintenance resolve error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
