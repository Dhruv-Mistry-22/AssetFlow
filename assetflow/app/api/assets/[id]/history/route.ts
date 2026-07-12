import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionOrUnauthorized } from "@/lib/auth-utils";

/**
 * GET /api/assets/[id]/history
 * Full per-asset history: state transitions + allocations + maintenance
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
    select: { id: true, assetTag: true, name: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const [stateHistory, allocations, maintenanceRequests, bookings] =
    await Promise.all([
      db.assetStateHistory.findMany({
        where: { assetId: id },
        orderBy: { changedAt: "desc" },
        include: {
          changedByUser: { select: { name: true, role: true } },
        },
      }),
      db.allocation.findMany({
        where: { assetId: id },
        orderBy: { allocatedAt: "desc" },
        include: {
          employee: { select: { id: true, name: true, email: true, department: true } },
        },
      }),
      db.maintenanceRequest.findMany({
        where: { assetId: id },
        orderBy: { createdAt: "desc" },
        include: {
          requestedByUser: { select: { id: true, name: true } },
        },
      }),
      db.booking.findMany({
        where: { assetId: id },
        orderBy: { startTime: "desc" },
        take: 20,
        include: {
          employee: { select: { id: true, name: true } },
        },
      }),
    ]);

  return NextResponse.json({
    asset,
    stateHistory,
    allocations,
    maintenanceRequests,
    bookings,
  });
}
