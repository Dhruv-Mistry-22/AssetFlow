import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.user.findMany();
    const departments = await db.department.findMany();
    const rawCategories = await db.assetCategory.findMany();
    const categories = rawCategories.map(c => ({
      ...c,
      customFields: c.customFields ? JSON.parse(c.customFields) : []
    }));
    const assets = await db.asset.findMany({ include: { category: true } });
    const allocations = await db.allocation.findMany({ include: { employee: true, asset: true } });
    const bookings = await db.booking.findMany({ include: { asset: true, employee: true } });
    const maintenanceRequests = await db.maintenanceRequest.findMany({ include: { asset: true, requestedByUser: true } });
    
    return NextResponse.json({
      users,
      departments,
      categories,
      assets,
      allocations,
      bookings,
      maintenanceRequests
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
  }
}
