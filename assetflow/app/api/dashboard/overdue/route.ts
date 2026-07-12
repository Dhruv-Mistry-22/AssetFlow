import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionOrUnauthorized } from "@/lib/auth-utils";

/**
 * GET /api/dashboard/overdue
 * List overdue allocations (active, past expected return date)
 * Visually separated on dashboard with red/amber accent
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const now = new Date();
  const where: Record<string, unknown> = {
    status: "ACTIVE",
    expectedReturnDate: { lt: now },
  };

  // Employees see only their own overdue
  if (session!.user.role === "EMPLOYEE") {
    where.employeeId = session!.user.id;
  }
  if (session!.user.role === "DEPARTMENT_HEAD") {
    where.department = session!.user.department;
  }

  const overdueAllocations = await db.allocation.findMany({
    where,
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          category: { select: { name: true } },
        },
      },
      employee: {
        select: { id: true, name: true, email: true, department: true },
      },
    },
    orderBy: { expectedReturnDate: "asc" }, // Most overdue first
  });

  // Calculate days overdue for each
  const withDaysOverdue = overdueAllocations.map((alloc) => ({
    ...alloc,
    daysOverdue: Math.floor(
      (now.getTime() - alloc.expectedReturnDate!.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }));

  return NextResponse.json({
    overdueAllocations: withDaysOverdue,
    total: withDaysOverdue.length,
    generatedAt: now.toISOString(),
  });
}
