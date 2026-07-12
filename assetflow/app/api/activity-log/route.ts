import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  getPaginationParams,
  paginatedResponse,
} from "@/lib/auth-utils";

/**
 * GET /api/activity-log
 * Full activity log — event feed of who did what, when.
 * ADMIN/ASSET_MANAGER: see all
 * EMPLOYEE/DEPT_HEAD: see only own
 *
 * Filters: action, resourceType, userId, startDate, endDate
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { page, limit, skip } = getPaginationParams(
    request.nextUrl.searchParams
  );
  const action = request.nextUrl.searchParams.get("action") || undefined;
  const resourceType =
    request.nextUrl.searchParams.get("resourceType") || undefined;
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  const where: Record<string, unknown> = {};

  // Non-admins see only their own activity
  if (!hasRole(session!.user.role, ["ADMIN", "ASSET_MANAGER"])) {
    where.userId = session!.user.id;
  }

  if (action) where.action = action;
  if (resourceType) where.resourceType = resourceType;
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) }),
    };
  }

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.activityLog.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(logs, total, page, limit));
}
