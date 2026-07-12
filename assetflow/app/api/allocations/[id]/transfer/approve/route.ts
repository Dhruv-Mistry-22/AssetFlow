import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { transferApproveSchema } from "@/lib/schemas";

/**
 * POST /api/allocations/[id]/transfer/approve
 * Approve or reject a transfer request.
 * On APPROVE: complete the transfer atomically (new allocation for requester)
 *
 * Role: ASSET_MANAGER, ADMIN, DEPARTMENT_HEAD (current holder can also approve)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { id: allocationId } = await params;
  const transferRequestId = new URL(request.url).searchParams.get(
    "transferId"
  );

  if (!transferRequestId) {
    return NextResponse.json(
      { error: "transferId query param required" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = transferApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }
    const { action, notes } = parsed.data;

    const transferRequest = await db.transferRequest.findUnique({
      where: { id: transferRequestId },
      include: {
        allocation: {
          include: {
            asset: true,
            employee: { select: { id: true, name: true } },
          },
        },
        requestedByUser: { select: { id: true, name: true } },
      },
    });

    if (!transferRequest) {
      return NextResponse.json(
        { error: "Transfer request not found" },
        { status: 404 }
      );
    }

    if (transferRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Transfer request is already ${transferRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Authorization: current holder or Asset Manager/Admin/Dept Head
    const isCurrentHolder =
      session!.user.id === transferRequest.allocation.employeeId;
    const isManager = hasRole(session!.user.role, [
      "ASSET_MANAGER",
      "ADMIN",
      "DEPARTMENT_HEAD",
    ]);

    if (!isCurrentHolder && !isManager) {
      return forbiddenResponse(["ASSET_MANAGER", "ADMIN", "DEPARTMENT_HEAD"]);
    }

    if (action === "REJECT") {
      await db.transferRequest.update({
        where: { id: transferRequestId },
        data: {
          status: "REJECTED",
          approvedByUserId: session!.user.id,
          approvedAt: new Date(),
        },
      });

      await db.notification.create({
        data: {
          userId: transferRequest.requestedByUserId,
          type: "TRANSFER_REJECTED",
          title: "Transfer Request Rejected",
          message: `Your transfer request for ${transferRequest.allocation.asset.name} was rejected.${notes ? ` Note: ${notes}` : ""}`,
          resourceType: "TransferRequest",
          resourceId: transferRequestId,
        },
      });

      return NextResponse.json({ message: "Transfer request rejected" });
    }

    // APPROVE: complete transfer atomically
    const result = await db.$transaction(async (tx) => {
      // Close current allocation
      await tx.allocation.update({
        where: { id: allocationId },
        data: { status: "RETURNED", returnedAt: new Date() },
      });

      // Create new allocation for the requester
      const newAllocation = await tx.allocation.create({
        data: {
          assetId: transferRequest.allocation.assetId,
          employeeId: transferRequest.requestedByUserId,
          status: "ACTIVE",
          notes: `Transferred from ${transferRequest.allocation.employee.name}`,
        },
        include: {
          asset: true,
          employee: { select: { name: true } },
        },
      });

      // Update transfer request status
      await tx.transferRequest.update({
        where: { id: transferRequestId },
        data: {
          status: "COMPLETED",
          approvedByUserId: session!.user.id,
          approvedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // State history
      await tx.assetStateHistory.create({
        data: {
          assetId: transferRequest.allocation.assetId,
          fromStatus: "ALLOCATED",
          toStatus: "ALLOCATED",
          reason: `Transferred from ${transferRequest.allocation.employee.name} to ${transferRequest.requestedByUser.name}`,
          changedByUserId: session!.user.id,
        },
      });

      // Notify requester
      await tx.notification.create({
        data: {
          userId: transferRequest.requestedByUserId,
          type: "TRANSFER_APPROVED",
          title: "Transfer Approved",
          message: `${transferRequest.allocation.asset.name} (${transferRequest.allocation.asset.assetTag}) has been transferred to you.`,
          resourceType: "Asset",
          resourceId: transferRequest.allocation.assetId,
        },
      });

      return newAllocation;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Transfer approve error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
