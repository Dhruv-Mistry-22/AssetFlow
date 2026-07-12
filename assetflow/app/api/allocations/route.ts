import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getSessionOrUnauthorized,
  hasRole,
  forbiddenResponse,
  getPaginationParams,
  paginatedResponse,
} from "@/lib/auth-utils";
import { allocateAssetSchema } from "@/lib/schemas";

/**
 * GET /api/allocations
 * Role-filtered list:
 *   EMPLOYEE        → only own allocations
 *   DEPARTMENT_HEAD → department allocations
 *   ASSET_MANAGER, ADMIN → all allocations
 */
export async function GET(request: NextRequest) {
  const { session, error } = await getSessionOrUnauthorized();
  if (error) return error;

  const { page, limit, skip } = getPaginationParams(
    request.nextUrl.searchParams
  );
  const status = request.nextUrl.searchParams.get("status") || "ACTIVE";

  const where: Record<string, unknown> = { status };

  if (session!.user.role === "EMPLOYEE") {
    where.employeeId = session!.user.id;
  } else if (session!.user.role === "DEPARTMENT_HEAD") {
    where.department = session!.user.department;
  }
  // ADMIN and ASSET_MANAGER see all

  const [allocations, total] = await Promise.all([
    db.allocation.findMany({
      where,
      include: {
        asset: { include: { category: true } },
        employee: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
      skip,
      take: limit,
      orderBy: { allocatedAt: "desc" },
    }),
    db.allocation.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(allocations, total, page, limit));
}

/**
 * POST /api/allocations
 * Allocate an asset to an employee.
 *
 * CRITICAL CONSTRAINT: The DB has a partial unique index:
 *   UNIQUE on Allocation(assetId) WHERE status = 'ACTIVE'
 * This means only ONE active allocation per asset can ever exist.
 * A second INSERT with the same assetId and status=ACTIVE fails with P2002.
 * We catch P2002 and return 409 with "currently held by [name]".
 *
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
    const parsed = allocateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { assetId, employeeId, expectedReturnDate, notes, department } =
      parsed.data;

    // Verify asset exists and is available
    const asset = await db.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    if (asset.status !== "AVAILABLE") {
      return NextResponse.json(
        {
          error: `Asset is currently ${asset.status.toLowerCase()}`,
          suggestion: "Request a transfer instead",
        },
        { status: 400 }
      );
    }

    // Verify employee exists
    const employee = await db.user.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Atomic allocation + asset status update + history + notification
    const allocation = await db.$transaction(async (tx) => {
      // This INSERT will fail with P2002 if another ACTIVE allocation exists for this asset
      // That's the double-allocation prevention — DB-enforced, race-condition-proof
      const newAllocation = await tx.allocation.create({
        data: {
          assetId,
          employeeId,
          department: department || employee.department || null,
          expectedReturnDate: expectedReturnDate
            ? new Date(expectedReturnDate)
            : null,
          notes: notes || null,
          status: "ACTIVE",
        },
        include: {
          asset: { include: { category: true } },
          employee: { select: { id: true, name: true, email: true } },
        },
      });

      // Flip asset status
      await tx.asset.update({
        where: { id: assetId },
        data: { status: "ALLOCATED" },
      });

      // Log state transition
      await tx.assetStateHistory.create({
        data: {
          assetId,
          fromStatus: "AVAILABLE",
          toStatus: "ALLOCATED",
          reason: `Allocated to ${employee.name}`,
          changedByUserId: session!.user.id,
        },
      });

      // Notify the employee
      await tx.notification.create({
        data: {
          userId: employeeId,
          type: "ASSET_ALLOCATED",
          title: `Asset Assigned: ${asset.name}`,
          message: `${asset.name} (${asset.assetTag}) has been allocated to you${expectedReturnDate ? `. Please return by ${new Date(expectedReturnDate).toDateString()}` : ""}.`,
          resourceType: "Asset",
          resourceId: assetId,
        },
      });

      return newAllocation;
    });

    // Log activity outside transaction
    await db.activityLog.create({
      data: {
        userId: session!.user.id,
        action: "ASSET_ALLOCATED",
        resourceType: "Asset",
        resourceId: assetId,
        details: JSON.stringify({
          assetTag: asset.assetTag,
          allocatedTo: employee.name,
          expectedReturn: expectedReturnDate,
        }),
      },
    });

    return NextResponse.json(allocation, { status: 201 });
  } catch (err: unknown) {
    const error = err as { code?: string };

    // ⚠️ DOUBLE-ALLOCATION BLOCK: P2002 = unique constraint violation
    if (error.code === "P2002") {
      // Find who currently holds it to show in the UI
      const currentHolder = await db.allocation.findFirst({
        where: { assetId: (err as { meta?: { target?: string[] } }).meta?.target?.[0], status: "ACTIVE" },
        include: {
          employee: { select: { name: true, email: true } },
          asset: { select: { assetTag: true, name: true } },
        },
      });

      return NextResponse.json(
        {
          error: "Asset is already allocated",
          heldBy: currentHolder?.employee?.name || "Unknown",
          heldByEmail: currentHolder?.employee?.email,
          assetTag: currentHolder?.asset?.assetTag,
          suggestion: "Request a transfer from the current holder",
        },
        { status: 409 }
      );
    }

    console.error("Allocation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
