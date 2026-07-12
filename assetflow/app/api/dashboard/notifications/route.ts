import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  getPaginationParams,
  paginatedResponse,
} from "@/lib/auth-utils";

/**
 * GET /api/dashboard/notifications
 * User's notifications — unread first, then by date desc.
 * Supports ?unreadOnly=true to filter unread.
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { page, limit, skip } = getPaginationParams(
    request.nextUrl.searchParams
  );
  const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";

  const where: Record<string, unknown> = {
    userId: session!.user.id,
    ...(unreadOnly && { isRead: false }),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { isRead: "asc" },    // Unread first
        { createdAt: "desc" }, // Newest first
      ],
    }),
    db.notification.count({ where }),
    db.notification.count({
      where: { userId: session!.user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({
    ...paginatedResponse(notifications, total, page, limit),
    unreadCount,
  });
}

/**
 * PATCH /api/dashboard/notifications
 * Mark notifications as read.
 * Body: { ids: string[] } or { all: true } to mark all read
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  try {
    const body = await request.json();
    const { ids, all } = body;

    if (all) {
      await db.notification.updateMany({
        where: { userId: session!.user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Provide ids array or all: true" },
        { status: 400 }
      );
    }

    await db.notification.updateMany({
      where: {
        id: { in: ids },
        userId: session!.user.id, // Security: can only mark own notifications
      },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ message: `${ids.length} notification(s) marked as read` });
  } catch (err) {
    console.error("Notification update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
