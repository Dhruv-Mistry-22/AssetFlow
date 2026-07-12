import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
  getPaginationParams,
  paginatedResponse,
  generateAssetTag,
} from "@/lib/auth-utils";
import { registerAssetSchema } from "@/lib/schemas";

/**
 * GET /api/assets
 * List assets with optional filters: status, categoryId, search, isBookable
 * All authenticated users can view assets
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { page, limit, skip } = getPaginationParams(
    request.nextUrl.searchParams
  );
  const status = request.nextUrl.searchParams.get("status") || undefined;
  const categoryId =
    request.nextUrl.searchParams.get("categoryId") || undefined;
  const search = request.nextUrl.searchParams.get("search") || undefined;
  const isBookable = request.nextUrl.searchParams.get("isBookable");

  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (isBookable !== null) where.isBookable = isBookable === "true";
  if (search) {
    where.OR = [
      { assetTag: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  const [assets, total] = await Promise.all([
    db.asset.findMany({
      where,
      include: {
        category: true,
        allocations: {
          where: { status: "ACTIVE" },
          include: { employee: { select: { id: true, name: true, email: true } } },
          take: 1,
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.asset.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(assets, total, page, limit));
}

/**
 * POST /api/assets
 * Register a new asset with auto-generated tag (AF-0001, AF-0002...)
 * Role: ASSET_MANAGER, ADMIN
 */
export async function POST(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  if (!hasRole(session!.user.role, ["ASSET_MANAGER", "ADMIN"])) {
    return forbiddenResponse(["ASSET_MANAGER", "ADMIN"]);
  }

  try {
    const body = await request.json();
    const parsed = registerAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.data },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify category exists
    const category = await db.assetCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Generate unique asset tag
    const assetTag = await generateAssetTag(db);

    // Create asset
    const asset = await db.asset.create({
      data: {
        assetTag,
        name: data.name,
        categoryId: data.categoryId,
        serialNumber: data.serialNumber,
        acquisitionDate: new Date(data.acquisitionDate),
        acquisitionCost: data.acquisitionCost,
        location: data.location || null,
        photoUrl: data.photoUrl || null,
        description: data.description || null,
        isBookable: data.isBookable,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        condition: data.condition,
        status: "AVAILABLE",
      },
      include: { category: true },
    });

    // Log state history
    await db.assetStateHistory.create({
      data: {
        assetId: asset.id,
        fromStatus: "NONE",
        toStatus: "AVAILABLE",
        reason: "Asset registered",
        changedByUserId: session!.user.id,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "ASSET_REGISTERED",
        resourceType: "Asset",
        resourceId: asset.id,
        details: JSON.stringify({
          assetTag,
          name: asset.name,
          category: category.name,
        }),
      },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("Asset registration error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
