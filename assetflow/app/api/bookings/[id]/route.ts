import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";

/**
 * GET /api/bookings/[id]
 * Get booking details
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      asset: true,
      employee: { select: { id: true, name: true, email: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Employees can only see their own bookings
  if (
    session!.user.role === "EMPLOYEE" &&
    booking.employeeId !== session!.user.id
  ) {
    return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
  }

  return NextResponse.json(booking);
}

/**
 * DELETE /api/bookings/[id]
 * Cancel a booking.
 * Auth: booking owner OR Asset Manager/Admin
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      asset: { select: { assetTag: true, name: true } },
      employee: { select: { name: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (!["UPCOMING", "ONGOING"].includes(booking.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a ${booking.status.toLowerCase()} booking` },
      { status: 400 }
    );
  }

  const isOwner = session!.user.id === booking.employeeId;
  const isManager = hasRole(session!.user.role, ["ASSET_MANAGER", "ADMIN"]);

  if (!isOwner && !isManager) {
    return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
  }

  await db.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await db.notification.create({
    data: {
      userId: booking.employeeId,
      type: "BOOKING_CANCELLED",
      title: "Booking Cancelled",
      message: `Your booking for ${booking.asset.name} (${booking.asset.assetTag}) has been cancelled.`,
      resourceType: "Booking",
      resourceId: id,
    },
  });

  await db.activityLog.create({
    data: {
      userId: session!.user.id,
      action: "BOOKING_CANCELLED",
      resourceType: "Booking",
      resourceId: id,
      details: JSON.stringify({
        assetTag: booking.asset.assetTag,
        cancelledBy: session!.user.name,
      }),
    },
  });

  return NextResponse.json({ message: "Booking cancelled successfully" });
}
