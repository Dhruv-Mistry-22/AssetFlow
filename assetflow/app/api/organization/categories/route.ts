import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
} from "@/lib/auth-utils";
import { createCategorySchema } from "@/lib/schemas";

/**
 * GET /api/organization/categories
 * List asset categories
 * All authenticated users can view (needed for asset registration form)
 */
export async function GET() {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const categories = await db.assetCategory.findMany({
    include: {
      _count: { select: { assets: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

/**
 * POST /api/organization/categories
 * Create asset category
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
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const category = await db.assetCategory.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        customFields: parsed.data.customFields || null,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "CATEGORY_CREATED",
        resourceType: "AssetCategory",
        resourceId: category.id,
        details: JSON.stringify({ name: category.name }),
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 409 }
      );
    }
    console.error("Category create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
