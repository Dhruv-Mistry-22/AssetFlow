import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";

// ============================================================================
// SESSION HELPERS
// ============================================================================

/**
 * Gets session or returns 401 response.
 * Usage: const { session, error } = await getSessionOrUnauthorized()
 */
export async function getSessionOrUnauthorized() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Unauthorized: Please sign in" },
        { status: 401 }
      ),
    };
  }

  return { session, error: null };
}

// ============================================================================
// ROLE CHECKING
// ============================================================================

/**
 * Checks if user has one of the required roles.
 * Returns true if authorized.
 */
export function hasRole(
  userRole: string,
  allowedRoles: UserRole[]
): boolean {
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Returns a 403 Forbidden response with a helpful message.
 */
export function forbiddenResponse(requiredRoles: string[]) {
  return NextResponse.json(
    {
      error: "Forbidden: Insufficient permissions",
      requiredRoles,
    },
    { status: 403 }
  );
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export function getPaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse(
  data: unknown[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// ============================================================================
// ERROR HELPERS
// ============================================================================

export function handlePrismaError(error: unknown) {
  const err = error as { code?: string; meta?: { target?: string[] } };

  if (err.code === "P2002") {
    return { isPrismaError: true, status: 409, code: "P2002" };
  }
  if (err.code === "P2025") {
    return { isPrismaError: true, status: 404, code: "P2025" };
  }
  return { isPrismaError: false, status: 500, code: "UNKNOWN" };
}

// ============================================================================
// ASSET TAG GENERATION
// ============================================================================

/**
 * Generates the next asset tag (AF-0001, AF-0002, etc.)
 * Reads the last created asset tag and increments.
 */
export async function generateAssetTag(
  db: import("@prisma/client").PrismaClient
): Promise<string> {
  const lastAsset = await db.asset.findFirst({
    orderBy: { createdAt: "desc" },
    select: { assetTag: true },
  });

  const lastNum = lastAsset?.assetTag
    ? parseInt(lastAsset.assetTag.replace("AF-", ""), 10)
    : 0;

  return `AF-${String(lastNum + 1).padStart(4, "0")}`;
}

// ============================================================================
// BOOKING OVERLAP CHECK
// ============================================================================

/**
 * Half-open interval check: existingStart < newEnd AND existingEnd > newStart
 * This means 9:00-10:00 blocks 9:30-10:30 but ALLOWS 10:00-11:00 (adjacent = OK)
 */
export async function checkBookingConflict(
  db: import("@prisma/client").PrismaClient,
  assetId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflict: unknown }> {
  const conflict = await db.booking.findFirst({
    where: {
      assetId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ["UPCOMING", "ONGOING"] },
      startTime: { lt: endTime },   // existing starts before new ends
      endTime: { gt: startTime },   // existing ends after new starts
    },
    include: {
      employee: { select: { name: true, email: true } },
    },
  });

  return { hasConflict: !!conflict, conflict };
}
