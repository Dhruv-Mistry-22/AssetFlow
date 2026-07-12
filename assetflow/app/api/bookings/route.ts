import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  getPaginationParams,
  paginatedResponse,
  checkBookingConflict,
} from "@/lib/auth-utils";
import { createBookingSchema } from "@/lib/schemas";

/**
 * GET /api/bookings
 * Calendar view: filter by assetId + date range
 * All authenticated users
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { page, limit, skip } = getPaginationParams(
    request.nextUrl.searchParams
  );
  const assetId = request.nextUrl.searchParams.get("assetId");
  const date = request.nextUrl.searchParams.get("date"); // YYYY-MM-DD
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");
  const status = request.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (assetId) where.assetId = assetId;
  if (status) where.status = status;

  // Single day view
  if (date) {
    where.startTime = {
      gte: new Date(`${date}T00:00:00.000Z`),
      lte: new Date(`${date}T23:59:59.999Z`),
    };
  }

  // Date range view
  if (startDate && endDate) {
    where.startTime = { gte: new Date(startDate) };
    where.endTime = { lte: new Date(endDate) };
  }

  // Employees see only their own bookings
  if (session!.user.role === "EMPLOYEE") {
    where.employeeId = session!.user.id;
  }

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        employee: { select: { id: true, name: true, email: true } },
      },
      skip,
      take: limit,
      orderBy: { startTime: "asc" },
    }),
    db.booking.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(bookings, total, page, limit));
}

/**
 * POST /api/bookings
 * Create a booking with OVERLAP VALIDATION.
 *
 * CRITICAL CONSTRAINT: Half-open interval check:
 *   existingStart < newEnd AND existingEnd > newStart
 * This means:
 *   ✅ 9:00–10:00 then 10:00–11:00 → OK (adjacent, not overlapping)
 *   ❌ 9:00–10:00 then 9:30–10:30 → REJECTED (overlap)
 *   ❌ 9:00–10:00 then 9:00–10:00 → REJECTED (same time)
 *
 * All authenticated users can book (bookable assets only)
 */
export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { assetId, startTime: startStr, endTime: endStr, purpose, location } =
      parsed.data;
    const startTime = new Date(startStr);
    const endTime = new Date(endStr);

    // Sanity check: end must be after start
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Must be in the future
    if (startTime <= new Date()) {
      return NextResponse.json(
        { error: "Booking must be in the future" },
        { status: 400 }
      );
    }

    // Verify asset exists and is bookable
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    if (!asset.isBookable) {
      return NextResponse.json(
        { error: "This asset is not available for booking" },
        { status: 400 }
      );
    }

    // ⚠️ OVERLAP CHECK: Half-open interval logic
    // existingStart < newEnd AND existingEnd > newStart
    const { hasConflict, conflict } = await checkBookingConflict(
      db,
      assetId,
      startTime,
      endTime
    );

    if (hasConflict) {
      // AI Booking Recommendations Logic
      const durationMs = endTime.getTime() - startTime.getTime();
      
      // 1. Suggest Alternative Time (right after the conflict ends)
      const conflictEnd = new Date((conflict as any).endTime);
      const suggestedEnd = new Date(conflictEnd.getTime() + durationMs);
      
      const { hasConflict: altTimeConflict } = await checkBookingConflict(
        db, assetId, conflictEnd, suggestedEnd
      );
      
      let alternativeTime = null;
      if (!altTimeConflict) {
        alternativeTime = { startTime: conflictEnd, endTime: suggestedEnd };
      }
      
      // 2. Suggest Alternative Asset (same category, free right now)
      const altAssets = await db.asset.findMany({
        where: { categoryId: asset.categoryId, isBookable: true, id: { not: assetId }, status: "AVAILABLE" },
        take: 5
      });
      
      let alternativeAsset = null;
      for (const altAsset of altAssets) {
        const { hasConflict: altAssetConflict } = await checkBookingConflict(
          db, altAsset.id, startTime, endTime
        );
        if (!altAssetConflict) {
          alternativeAsset = { id: altAsset.id, name: altAsset.name, assetTag: altAsset.assetTag };
          break;
        }
      }
      
      return NextResponse.json(
        {
          error: "Time slot is already booked",
          conflictingBooking: conflict,
          recommendations: {
            alternativeTime,
            alternativeAsset
          },
          hint: "Adjacent bookings are allowed (e.g. 10:00 immediately after 9:00–10:00)",
        },
        { status: 409 }
      );
    }

    // Create booking
    const booking = await db.booking.create({
      data: {
        assetId,
        employeeId: session!.user.id,
        startTime,
        endTime,
        purpose: purpose || null,
        location: location || null,
        status: "UPCOMING",
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        employee: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify the booker
    await db.notification.create({
      data: {
        userId: session!.user.id,
        type: "BOOKING_CONFIRMED",
        title: `Booking Confirmed: ${asset.name}`,
        message: `Your booking for ${asset.name} on ${startTime.toDateString()} (${startTime.toLocaleTimeString()} – ${endTime.toLocaleTimeString()}) is confirmed.`,
        resourceType: "Booking",
        resourceId: booking.id,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "BOOKING_CREATED",
        resourceType: "Booking",
        resourceId: booking.id,
        details: JSON.stringify({
          assetTag: asset.assetTag,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
