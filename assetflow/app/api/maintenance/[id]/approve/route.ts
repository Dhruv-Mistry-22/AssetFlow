import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { resolveMaintenanceSchema } from "@/lib/schemas";

/**
 * POST /api/maintenance/[id]/approve
 * Approve a maintenance request.
 * Auto-flips asset status to UNDER_MAINTENANCE.
 * Role: ASSET_MANAGER, ADMIN
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ASSET_MANAGER", "ADMIN"])) {
    return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
  }

  const { id } = await params;

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

  if (maintenanceRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: `Request is already ${maintenanceRequest.status.toLowerCase()}` },
      { status: 400 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.maintenanceRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    // Auto-flip asset to UNDER_MAINTENANCE
    const previousStatus = maintenanceRequest.asset.status;
    await tx.asset.update({
      where: { id: maintenanceRequest.assetId },
      data: { status: "UNDER_MAINTENANCE" },
    });

    // State history
    await tx.assetStateHistory.create({
      data: {
        assetId: maintenanceRequest.assetId,
        fromStatus: previousStatus,
        toStatus: "UNDER_MAINTENANCE",
        reason: `Maintenance approved: ${maintenanceRequest.description.substring(0, 100)}`,
        changedByUserId: session!.user.id,
      },
    });

    // Notify requester
    await tx.notification.create({
      data: {
        userId: maintenanceRequest.requestedByUserId,
        type: "MAINTENANCE_APPROVED",
        title: "Maintenance Request Approved",
        message: `Your maintenance request for ${maintenanceRequest.asset.name} (${maintenanceRequest.asset.assetTag}) has been approved.`,
        resourceType: "MaintenanceRequest",
        resourceId: id,
      },
    });
  });

  await db.activityLog.create({
    data: {
      userId: session!.user.id,
      action: "MAINTENANCE_APPROVED",
      resourceType: "MaintenanceRequest",
      resourceId: id,
    },
  });

  return NextResponse.json({ message: "Maintenance request approved, asset set to UNDER_MAINTENANCE" });
}
