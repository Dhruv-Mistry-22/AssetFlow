import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { getSessionOrUnauthorized, hasRole, forbiddenResponse } from "@/lib/auth-utils";

/**
 * GET /api/reports/assets
 * Export assets as CSV
 * Role: ASSET_MANAGER, ADMIN
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ASSET_MANAGER", "ADMIN"])) {
    return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
  }

  const status = request.nextUrl.searchParams.get("status") || undefined;

  const assets = await db.asset.findMany({
    where: status ? { status: status as never } : {},
    include: {
      category: true,
      allocations: {
        where: { status: "ACTIVE" },
        include: { employee: { select: { name: true, email: true } } },
        take: 1,
      },
    },
    orderBy: { assetTag: "asc" },
  });

  const rows = assets.map((a) => ({
    "Asset Tag": a.assetTag,
    "Name": a.name,
    "Category": a.category.name,
    "Serial Number": a.serialNumber,
    "Status": a.status,
    "Condition": a.condition,
    "Location": a.location || "",
    "Acquisition Date": a.acquisitionDate.toISOString().split("T")[0],
    "Acquisition Cost": a.acquisitionCost,
    "Warranty Expiry": a.warrantyExpiry?.toISOString().split("T")[0] || "",
    "Is Bookable": a.isBookable ? "Yes" : "No",
    "Current Holder": a.allocations[0]?.employee?.name || "",
    "Holder Email": a.allocations[0]?.employee?.email || "",
    "Created At": a.createdAt.toISOString().split("T")[0],
  }));

  const csv = Papa.unparse(rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="assetflow-assets-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
