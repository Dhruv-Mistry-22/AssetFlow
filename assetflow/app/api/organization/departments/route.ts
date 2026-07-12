import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { createDepartmentSchema, updateDepartmentSchema } from "@/lib/schemas";

/**
 * GET /api/organization/departments
 * List all departments with hierarchy
 * Role: All authenticated (read), Admin only (write)
 */
export async function GET() {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const departments = await db.department.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  // Build hierarchy tree
  const deptMap = new Map(departments.map((d) => [d.id, { ...d, children: [] as typeof departments }]));
  const roots: typeof departments = [];

  for (const dept of departments) {
    if (dept.parentDepartmentId) {
      const parent = deptMap.get(dept.parentDepartmentId);
      if (parent) (parent.children as unknown as typeof departments).push(dept);
    } else {
      roots.push(dept);
    }
  }

  return NextResponse.json({ departments, tree: roots });
}

/**
 * POST /api/organization/departments
 * Create a department
 * Role: ADMIN only
 */
export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ADMIN"])) {
    return forbiddenResponse(["ADMIN"]);
  }

  try {
    const body = await request.json();
    const parsed = createDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const dept = await db.department.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        parentDepartmentId: parsed.data.parentDepartmentId || null,
        headOfDepartmentId: parsed.data.headOfDepartmentId || null,
        status: "ACTIVE",
      },
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "DEPARTMENT_CREATED",
        resourceType: "Department",
        resourceId: dept.id,
        details: JSON.stringify({ name: dept.name }),
      },
    });

    return NextResponse.json(dept, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Department with this name already exists" },
        { status: 409 }
      );
    }
    console.error("Department create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/organization/departments/[id]
 * Update a department
 * Role: ADMIN only
 */
export async function PATCH(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ADMIN"])) {
    return forbiddenResponse(["ADMIN"]);
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const parsed = updateDepartmentSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const dept = await db.department.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(dept);
  } catch (err) {
    console.error("Department update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
