import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper to convert Prisma UPPERCASE status to UI Title Case status
function toTitleCaseStatus(status: string): string {
  if (!status) return 'Unknown';
  if (status === 'UNDER_MAINTENANCE') return 'Under_Maintenance';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export async function GET() {
  try {
    const users = await db.user.findMany();
    const departments = await db.department.findMany();
    const rawCategories = await db.assetCategory.findMany();
    
    const categories = rawCategories.map(c => ({
      ...c,
      customFields: c.customFields ? JSON.parse(c.customFields) : []
    }));
    
    // 1. Map Assets
    const rawAssets = await db.asset.findMany({ include: { category: true } });
    const assets = rawAssets.map(a => ({
      ...a,
      status: toTitleCaseStatus(a.status),
      categoryName: a.category ? a.category.name : 'Unknown'
    }));

    // 2. Map Allocations
    const rawAllocations = await db.allocation.findMany({ include: { employee: true, asset: true } });
    const allocations = rawAllocations.map(al => ({
      ...al,
      userId: al.employeeId,
      departmentId: al.department,
      assetName: al.asset ? al.asset.name : 'Unknown Asset',
      assetTag: al.asset ? al.asset.assetTag : 'Unknown Tag',
      userName: al.employee ? al.employee.name : null,
      departmentName: al.department // in Prisma, it's just a string, so we map it to both Id and Name for mock data compatibility
    }));

    // 3. Map Bookings
    const rawBookings = await db.booking.findMany({ include: { asset: true, employee: true } });
    const bookings = rawBookings.map(b => ({
      ...b,
      userId: b.employeeId,
      assetName: b.asset ? b.asset.name : 'Unknown Asset',
      userName: b.employee ? b.employee.name : 'Unknown User'
    }));

    // 4. Map Maintenance Requests
    const rawMaintenanceRequests = await db.maintenanceRequest.findMany({ include: { asset: true, requestedByUser: true } });
    const maintenanceRequests = rawMaintenanceRequests.map((m: any) => ({
      ...m,
      raisedById: m.requestedByUserId,
      assetName: m.asset ? m.asset.name : 'Unknown Asset',
      assetTag: m.asset ? m.asset.assetTag : 'Unknown Tag',
      raisedByName: m.requestedByUser ? m.requestedByUser.name : 'Unknown User',
      technicianName: null,
      status: m.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : m.status,
    }));
    
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
