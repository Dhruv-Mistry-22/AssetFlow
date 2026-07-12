import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { returnAssetSchema } from "@/lib/schemas";

/**
 * POST /api/allocations/[id]/return
 * Return an allocated asset back to available.
 * Atomic transaction: mark RETURNED + set asset AVAILABLE + log history + notify
 *
 * Who can return:
 *   - The current holder (employee)
 *   - Asset Manager
 *   - Admin
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
    const parsed = returnAssetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }
    const { returnCondition, returnNotes } = parsed.data;

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
        { error: `Allocation is already ${allocation.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Authorization: current holder, Asset Manager, or Admin
    const isHolder = session!.user.id === allocation.employeeId;
    const isManager = hasRole(session!.user.role, ["ASSET_MANAGER", "ADMIN"]);
    if (!isHolder && !isManager) {
      return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.allocation.update({
        where: { id: allocationId },
        data: {
          status: "RETURNED",
          returnedAt: new Date(),
          returnCondition: returnCondition || null,
          returnNotes: returnNotes || null,
        },
        include: {
          asset: true,
          employee: { select: { id: true, name: true, email: true } },
        },
      });

      // Flip asset back to available
      await tx.asset.update({
        where: { id: allocation.assetId },
        data: {
          status: "AVAILABLE",
          ...(returnCondition && { condition: returnCondition }),
        },
      });

      // State history
      await tx.assetStateHistory.create({
        data: {
          assetId: allocation.assetId,
          fromStatus: "ALLOCATED",
          toStatus: "AVAILABLE",
          reason: `Returned by ${allocation.employee.name}${returnNotes ? `: ${returnNotes}` : ""}`,
          changedByUserId: session!.user.id,
        },
      });

      // Notify the employee
      await tx.notification.create({
        data: {
          userId: allocation.employeeId,
          type: "ASSET_RETURNED",
          title: "Asset Return Confirmed",
          message: `${allocation.asset.name} (${allocation.asset.assetTag}) has been returned successfully.`,
          resourceType: "Asset",
          resourceId: allocation.assetId,
        },
      });

      return result;
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "ASSET_RETURNED",
        resourceType: "Asset",
        resourceId: allocation.assetId,
        details: JSON.stringify({
          assetTag: allocation.asset.assetTag,
          returnedBy: allocation.employee.name,
          condition: returnCondition,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Return error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
