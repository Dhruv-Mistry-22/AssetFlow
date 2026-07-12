import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { updateAssetSchema } from "@/lib/schemas";

/**
 * GET /api/assets/[id]
 * Get asset details with full history
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { id } = await params;

  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      category: true,
      allocations: {
        orderBy: { allocatedAt: "desc" },
        take: 10,
        include: {
          employee: { select: { id: true, name: true, email: true } },
        },
      },
      bookings: {
        where: { status: { in: ["UPCOMING", "ONGOING"] } },
        orderBy: { startTime: "asc" },
        take: 5,
        include: {
          employee: { select: { id: true, name: true } },
        },
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          requestedByUser: { select: { id: true, name: true } },
        },
      },
      stateHistory: {
        orderBy: { changedAt: "desc" },
        take: 20,
        include: {
          changedByUser: { select: { name: true } },
        },
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json(asset);
}

/**
 * PUT /api/assets/[id]
 * Update asset details
 * Role: ASSET_MANAGER, ADMIN
 */
export async function PUT(
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
    const parsed = updateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const existing = await db.asset.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.name) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.condition) updateData.condition = data.condition;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl || null;
    if (data.isBookable !== undefined) updateData.isBookable = data.isBookable;
    if (data.warrantyExpiry) updateData.warrantyExpiry = new Date(data.warrantyExpiry);
    if (data.nextServiceDate) updateData.nextServiceDate = new Date(data.nextServiceDate);

    // Track status change
    if (data.status && data.status !== existing.status) {
      updateData.status = data.status;

      await db.assetStateHistory.create({
        data: {
          assetId: id,
          fromStatus: existing.status,
          toStatus: data.status,
          reason: "Manual status update",
          changedByUserId: session!.user.id,
        },
      });
    }

    const asset = await db.asset.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "ASSET_UPDATED",
        resourceType: "Asset",
        resourceId: id,
        details: JSON.stringify({ assetTag: asset.assetTag, changes: updateData }),
      },
    });

    return NextResponse.json(asset);
  } catch (err) {
    console.error("Asset update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assets/[id]
 * Soft delete — sets status to DISPOSED
 * Role: ADMIN only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ADMIN"])) {
    return forbiddenResponse(["ADMIN"]);
  }

  const { id } = await params;

  const existing = await db.asset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (existing.status === "ALLOCATED") {
    return NextResponse.json(
      { error: "Cannot decommission an allocated asset. Return it first." },
      { status: 400 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.asset.update({
      where: { id },
      data: { status: "DISPOSED" },
    });

    await tx.assetStateHistory.create({
      data: {
        assetId: id,
        fromStatus: existing.status,
        toStatus: "DISPOSED",
        reason: "Asset decommissioned",
        changedByUserId: session!.user.id,
      },
    });

    await tx.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "ASSET_DECOMMISSIONED",
        resourceType: "Asset",
        resourceId: id,
        details: JSON.stringify({ assetTag: existing.assetTag }),
      },
    });
  });

  return NextResponse.json({ message: "Asset decommissioned successfully" });
}
