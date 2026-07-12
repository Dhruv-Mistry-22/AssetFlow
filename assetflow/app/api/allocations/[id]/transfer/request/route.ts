import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { transferRequestSchema, transferApproveSchema } from "@/lib/schemas";

/**
 * POST /api/allocations/[id]/transfer/request
 * Request a transfer of an asset from its current holder.
 * Any authenticated user can request.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { id: allocationId } = await params;

  try {
    const body = await request.json();
    const parsed = transferRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const allocation = await db.allocation.findUnique({
      where: { id: allocationId },
      include: {
        asset: true,
        employee: { select: { id: true, name: true } },
      },
    });

    if (!allocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 }
      );
    }

    if (allocation.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Can only request transfer of an active allocation" },
        { status: 400 }
      );
    }

    // Can't request transfer of your own allocation
    if (allocation.employeeId === session!.user.id) {
      return NextResponse.json(
        { error: "You already hold this asset" },
        { status: 400 }
      );
    }

    // Check for existing pending request from this user
    const existing = await db.transferRequest.findFirst({
      where: {
        allocationId,
        requestedByUserId: session!.user.id,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending transfer request for this asset" },
        { status: 409 }
      );
    }

    const transferRequest = await db.transferRequest.create({
      data: {
        allocationId,
        requestedByUserId: session!.user.id,
        reason: parsed.data.reason,
        status: "PENDING",
      },
      include: {
        requestedByUser: { select: { name: true, email: true } },
        allocation: {
          include: { asset: true, employee: { select: { name: true } } },
        },
      },
    });

    // Notify the current holder and asset managers
    await db.notification.create({
      data: {
        userId: allocation.employeeId,
        type: "TRANSFER_REQUESTED",
        title: `Transfer Request: ${allocation.asset.name}`,
        message: `${session!.user.name} has requested a transfer of ${allocation.asset.name} (${allocation.asset.assetTag}).`,
        resourceType: "TransferRequest",
        resourceId: transferRequest.id,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "TRANSFER_REQUESTED",
        resourceType: "TransferRequest",
        resourceId: transferRequest.id,
        details: JSON.stringify({
          assetTag: allocation.asset.assetTag,
          currentHolder: allocation.employee.name,
          reason: parsed.data.reason,
        }),
      },
    });

    return NextResponse.json(transferRequest, { status: 201 });
  } catch (err) {
    console.error("Transfer request error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
