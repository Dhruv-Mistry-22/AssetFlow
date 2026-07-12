import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
  getPaginationParams,
  paginatedResponse,
} from "@/lib/auth-utils";

/**
 * GET /api/audits
 * List audit cycles
 * Role: ADMIN, ASSET_MANAGER
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ADMIN", "ASSET_MANAGER"])) {
    return forbiddenResponse(["ADMIN", "ASSET_MANAGER"]);
  }

  const { page, limit, skip } = getPaginationParams(request.nextUrl.searchParams);
  const status = request.nextUrl.searchParams.get("status") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [audits, total] = await Promise.all([
    db.auditCycle.findMany({
      where,
      include: {
        createdByUser: { select: { name: true } },
        _count: { select: { auditItems: true, discrepancies: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.auditCycle.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(audits, total, page, limit));
}
