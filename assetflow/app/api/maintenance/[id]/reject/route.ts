import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";

const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

/**
 * POST /api/maintenance/[id]/reject
 * Reject a pending maintenance request.
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
    const parsed = rejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const maintenanceRequest = await db.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: { select: { assetTag: true, name: true } },
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

    await db.maintenanceRequest.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    await db.notification.create({
      data: {
        userId: maintenanceRequest.requestedByUserId,
        type: "MAINTENANCE_REJECTED",
        title: "Maintenance Request Rejected",
        message: `Your maintenance request for ${maintenanceRequest.asset.name} was rejected. Reason: ${parsed.data.reason}`,
        resourceType: "MaintenanceRequest",
        resourceId: id,
      },
    });

    return NextResponse.json({ message: "Maintenance request rejected" });
  } catch (err) {
    console.error("Maintenance reject error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
