import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionOrUnauthorized } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const notifications = await db.notification.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  // Mark all as read
  await db.notification.updateMany({
    where: { userId: session!.user.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
