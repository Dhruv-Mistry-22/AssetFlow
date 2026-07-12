import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { getSessionOrUnauthorized, hasRole, forbiddenResponse } from "@/lib/auth-utils";

/**
 * GET /api/reports/allocations
 * Export allocations as CSV — department allocation summary
 * Role: ASSET_MANAGER, ADMIN
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ASSET_MANAGER", "ADMIN"])) {
    return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
  }

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const department = request.nextUrl.searchParams.get("department") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (department) where.department = department;

  const allocations = await db.allocation.findMany({
    where,
    include: {
      asset: { include: { category: true } },
      employee: { select: { name: true, email: true, department: true } },
    },
    orderBy: { allocatedAt: "desc" },
  });

  const rows = allocations.map((a) => ({
    "Asset Tag": a.asset.assetTag,
    "Asset Name": a.asset.name,
    "Category": a.asset.category.name,
    "Employee Name": a.employee.name,
    "Employee Email": a.employee.email,
    "Department": a.department || a.employee.department || "",
    "Status": a.status,
    "Allocated At": a.allocatedAt.toISOString().split("T")[0],
    "Expected Return": a.expectedReturnDate?.toISOString().split("T")[0] || "",
    "Returned At": a.returnedAt?.toISOString().split("T")[0] || "",
    "Return Condition": a.returnCondition || "",
    "Notes": a.notes || "",
    "Is Overdue": a.status === "ACTIVE" && a.expectedReturnDate && a.expectedReturnDate < new Date() ? "YES" : "No",
  }));

  const csv = Papa.unparse(rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="assetflow-allocations-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
