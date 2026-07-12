import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
  getPaginationParams,
  paginatedResponse,
} from "@/lib/auth-utils";
import { createMaintenanceSchema } from "@/lib/schemas";

/**
 * GET /api/maintenance
 * List maintenance requests (role-filtered)
 * Employees see only their own requests
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { page, limit, skip } = getPaginationParams(
    request.nextUrl.searchParams
  );
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const priority = request.nextUrl.searchParams.get("priority") || undefined;
  const assetId = request.nextUrl.searchParams.get("assetId") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assetId) where.assetId = assetId;

  // Employees see only their own requests
  if (session!.user.role === "EMPLOYEE") {
    where.requestedByUserId = session!.user.id;
  }

  const [requests, total] = await Promise.all([
    db.maintenanceRequest.findMany({
      where,
      include: {
        asset: { select: { id: true, assetTag: true, name: true, status: true } },
        requestedByUser: { select: { id: true, name: true, email: true } },
      },
      skip,
      take: limit,
      orderBy: [
        { priority: "desc" }, // CRITICAL first
        { createdAt: "desc" },
      ],
    }),
    db.maintenanceRequest.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(requests, total, page, limit));
}

/**
 * POST /api/maintenance
 * Raise a maintenance request.
 * Any authenticated user can raise a request.
 * Asset is NOT immediately put under maintenance — needs approval first.
 */
export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createMaintenanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { assetId, priority, description, photoUrl } = parsed.data;

    // Verify asset exists
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Don't allow maintenance on already-disposed assets
    if (["DISPOSED", "RETIRED"].includes(asset.status)) {
      return NextResponse.json(
        { error: `Cannot raise maintenance for a ${asset.status.toLowerCase()} asset` },
        { status: 400 }
      );
    }

    const maintenanceRequest = await db.maintenanceRequest.create({
      data: {
        assetId,
        requestedByUserId: session!.user.id,
        priority,
        description,
        photoUrl: photoUrl || null,
        status: "PENDING",
      },
      include: {
        asset: { select: { assetTag: true, name: true } },
        requestedByUser: { select: { name: true } },
      },
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "MAINTENANCE_RAISED",
        resourceType: "MaintenanceRequest",
        resourceId: maintenanceRequest.id,
        details: JSON.stringify({
          assetTag: asset.assetTag,
          priority,
          description: description.substring(0, 100),
        }),
      },
    });

    return NextResponse.json(maintenanceRequest, { status: 201 });
  } catch (err) {
    console.error("Maintenance create error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
