import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionOrUnauthorized } from "@/lib/auth-utils";

/**
 * GET /api/dashboard/kpis
 * Real KPI cards — all queries parallelized with Promise.all for speed.
 * All authenticated users (numbers are org-wide for managers, dept-scoped for employees)
 *
 * Returns:
 * - assets: total, available, allocated, maintenance, reserved, utilization%
 * - alerts: overdueReturns, activeBookings, maintenanceToday, pendingTransfers
 * - org: totalEmployees, activeDepartments
 */
export async function GET() {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const now = new Date();
  const todayStart = new Date(now.toDateString());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);

  // Scope KPIs by role
  const isEmployee = session!.user.role === "EMPLOYEE";
  const isDeptHead = session!.user.role === "DEPARTMENT_HEAD";

  const allocationWhere: Record<string, unknown> = { status: "ACTIVE" };
  if (isEmployee) allocationWhere.employeeId = session!.user.id;
  if (isDeptHead) allocationWhere.department = session!.user.department;

  const [
    totalAssets,
    availableAssets,
    allocatedAssets,
    maintenanceAssets,
    reservedAssets,
    overdueReturns,
    activeBookings,
    pendingMaintenance,
    maintenanceToday,
    pendingTransfers,
    totalEmployees,
    activeDepartments,
    recentActivity,
  ] = await Promise.all([
    // Asset counts
    db.asset.count(),
    db.asset.count({ where: { status: "AVAILABLE" } }),
    db.asset.count({ where: { status: "ALLOCATED" } }),
    db.asset.count({ where: { status: "UNDER_MAINTENANCE" } }),
    db.asset.count({ where: { status: "RESERVED" } }),

    // Overdue: active allocations past expected return date
    db.allocation.count({
      where: {
        ...allocationWhere,
        expectedReturnDate: { lt: now },
      },
    }),

    // Active bookings (upcoming + ongoing)
    db.booking.count({
      where: {
        status: { in: ["UPCOMING", "ONGOING"] },
        ...(isEmployee && { employeeId: session!.user.id }),
      },
    }),

    // Pending maintenance approvals
    db.maintenanceRequest.count({ where: { status: "PENDING" } }),

    // Maintenance requests raised today
    db.maintenanceRequest.count({
      where: {
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
    }),

    // Pending transfer requests
    db.transferRequest.count({ where: { status: "PENDING" } }),

    // Org stats (admins/managers only — employees get placeholder)
    !isEmployee
      ? db.user.count({ where: { status: "ACTIVE" } })
      : Promise.resolve(0),
    !isEmployee
      ? db.department.count({ where: { status: "ACTIVE" } })
      : Promise.resolve(0),

    // Recent 5 activity items for the dashboard feed
    db.activityLog.findMany({
      where: isEmployee ? { userId: session!.user.id } : {},
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { name: true, role: true } },
      },
    }),
  ]);

  const utilization =
    totalAssets > 0
      ? parseFloat(((allocatedAssets / totalAssets) * 100).toFixed(1))
      : 0;

  return NextResponse.json({
    assets: {
      total: totalAssets,
      available: availableAssets,
      allocated: allocatedAssets,
      underMaintenance: maintenanceAssets,
      reserved: reservedAssets,
      utilization: `${utilization}%`,
      utilizationValue: utilization,
    },
    alerts: {
      overdueReturns,
      activeBookings,
      pendingMaintenance,
      maintenanceToday,
      pendingTransfers,
    },
    org: {
      totalEmployees,
      activeDepartments,
    },
    recentActivity,
    generatedAt: now.toISOString(),
  });
}
