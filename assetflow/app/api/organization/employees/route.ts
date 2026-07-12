import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
  getPaginationParams,
  paginatedResponse,
} from "@/lib/auth-utils";
import { promoteUserSchema } from "@/lib/schemas";

/**
 * GET /api/organization/employees
 * Employee directory with roles
 * Role: ADMIN (full), ASSET_MANAGER/DEPT_HEAD (limited view for allocation forms)
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { page, limit, skip } = getPaginationParams(
    request.nextUrl.searchParams
  );
  const role = request.nextUrl.searchParams.get("role") || undefined;
  const department = request.nextUrl.searchParams.get("department") || undefined;
  const search = request.nextUrl.searchParams.get("search") || undefined;
  const status = request.nextUrl.searchParams.get("status") || "ACTIVE";

  const where: Record<string, unknown> = { status };
  if (role) where.role = role;
  if (department) where.department = department;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Dept heads see only their department
  if (session!.user.role === "DEPARTMENT_HEAD") {
    where.department = session!.user.department;
  }

  const isAdmin = hasRole(session!.user.role, ["ADMIN"]);

  const [employees, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        // Include allocation count for context
        _count: {
          select: { allocations: true },
        },
      },
      skip,
      take: limit,
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(employees, total, page, limit));
}

/**
 * PATCH /api/organization/employees/[id]/promote
 * Promote/demote a user's role — ADMIN only action.
 * This is the ONLY place where role changes happen (by design).
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ADMIN"])) {
    return forbiddenResponse(["ADMIN"]);
  }

  try {
    const body = await request.json();
    const { userId, ...rest } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const parsed = promoteUserSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid role", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Admin cannot demote themselves
    if (userId === session!.user.id && parsed.data.role !== "ADMIN") {
      return NextResponse.json(
        { error: "You cannot change your own admin role" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true },
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "USER_ROLE_CHANGED",
        resourceType: "User",
        resourceId: userId,
        details: JSON.stringify({
          from: user.role,
          to: parsed.data.role,
          userName: user.name,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Role promote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
