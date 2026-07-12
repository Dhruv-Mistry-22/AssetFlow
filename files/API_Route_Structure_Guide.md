# AssetFlow API Route Structure & Implementation Guide

Complete guide to implementing REST API endpoints with validation, error handling, and role-based access control.

---

## 1. API DIRECTORY STRUCTURE

```
app/api/
├── auth/
│   ├── signin/route.ts          # POST: Email/password login
│   ├── signup/route.ts          # POST: Create new employee account
│   ├── signout/route.ts         # POST: Logout
│   └── session/route.ts         # GET: Check current session
│
├── assets/
│   ├── route.ts                 # GET: List assets (with filters)
│   │                            # POST: Register new asset
│   ├── [id]/route.ts            # GET: Asset details
│   │                            # PUT: Update asset
│   │                            # DELETE: Decommission asset
│   ├── [id]/history/route.ts    # GET: Asset state history
│   └── search/route.ts          # GET: Search assets by tag/name/serial
│
├── allocations/
│   ├── route.ts                 # GET: List allocations (filtered by role)
│   │                            # POST: Allocate asset to employee
│   ├── [id]/route.ts            # GET: Allocation details
│   ├── [id]/return/route.ts     # POST: Return asset
│   └── [id]/transfer/route.ts   # POST: Request transfer
│
├── bookings/
│   ├── route.ts                 # GET: List bookings (calendar view)
│   │                            # POST: Create new booking
│   ├── [id]/route.ts            # GET: Booking details
│   │                            # PUT: Update booking (reschedule)
│   │                            # DELETE: Cancel booking
│   └── [id]/checkin/route.ts    # POST: Manual checkin (mark ongoing)
│
├── maintenance/
│   ├── route.ts                 # GET: List maintenance requests
│   │                            # POST: Raise new request
│   ├── [id]/route.ts            # GET: Request details
│   ├── [id]/approve/route.ts    # POST: Approve request (Asset Manager)
│   ├── [id]/reject/route.ts     # POST: Reject request
│   └── [id]/complete/route.ts   # POST: Mark resolved
│
├── audits/
│   ├── route.ts                 # GET: List audit cycles
│   │                            # POST: Create audit cycle
│   ├── [id]/route.ts            # GET: Audit details
│   ├── [id]/items/route.ts      # POST: Record audit item (verified/missing)
│   └── [id]/close/route.ts      # POST: Close audit cycle
│
├── dashboard/
│   ├── kpis/route.ts            # GET: KPI metrics
│   ├── overdue/route.ts         # GET: Overdue returns
│   └── notifications/route.ts   # GET: User notifications
│
├── reports/
│   ├── assets/route.ts          # GET: Export assets as CSV
│   ├── allocations/route.ts     # GET: Export allocations as CSV
│   ├── maintenance/route.ts     # GET: Export maintenance requests
│   └── audit/route.ts           # GET: Export audit discrepancies
│
├── organization/
│   ├── departments/route.ts     # GET/POST: Manage departments (Admin only)
│   ├── categories/route.ts      # GET/POST: Asset categories (Admin only)
│   └── employees/route.ts       # GET: List employees with roles (Admin)
│
└── middleware/
    ├── auth.ts                  # Session validation
    └── rbac.ts                  # Role-based access control
```

---

## 2. MIDDLEWARE PATTERNS

### Authentication Middleware

```typescript
// app/api/middleware/auth.ts

import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

export async function withAuth(request: NextRequest, handler: any) {
  const session = await auth()
  
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    })
  }

  // Attach session to request
  (request as any).session = session
  return handler(request)
}

// Usage in API routes:
// export async function GET(request: Request) {
//   return withAuth(request, async (req) => {
//     const session = (req as any).session
//     // ... handler code
//   })
// }
```

### Role-Based Access Control

```typescript
// app/api/middleware/rbac.ts

import { UserRole } from "@prisma/client"

export function requireRole(...roles: UserRole[]) {
  return function (handler: any) {
    return async (request: any) => {
      const session = (request as any).session
      
      if (!session?.user?.role || !roles.includes(session.user.role)) {
        return new Response(
          JSON.stringify({ error: "Forbidden: insufficient permissions" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        )
      }
      
      return handler(request)
    }
  }
}

// Usage:
// const requireAssetManager = requireRole("ASSET_MANAGER", "ADMIN")
// export const POST = requireAssetManager(allocateAssetHandler)
```

---

## 3. ENDPOINT IMPLEMENTATIONS

### Asset Registration

```typescript
// app/api/assets/route.ts

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

const registerAssetSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().cuid(),
  serialNumber: z.string(),
  acquisitionDate: z.string().datetime(),
  acquisitionCost: z.number().positive(),
  location: z.string().optional(),
  photoUrl: z.string().url().optional(),
  isBookable: z.boolean().optional().default(false)
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status")
  const categoryId = searchParams.get("categoryId")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = 50

  const assets = await db.asset.findMany({
    where: {
      ...(status && { status }),
      ...(categoryId && { categoryId })
    },
    include: { category: true },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" }
  })

  const total = await db.asset.count({
    where: {
      ...(status && { status }),
      ...(categoryId && { categoryId })
    }
  })

  return NextResponse.json({
    assets,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  
  // Only ASSET_MANAGER and ADMIN can register
  if (!session?.user?.id || !["ASSET_MANAGER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = registerAssetSchema.parse(body)

    // Verify category exists
    const category = await db.assetCategory.findUnique({
      where: { id: data.categoryId }
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Generate asset tag
    const lastAsset = await db.asset.findFirst({
      orderBy: { createdAt: "desc" },
      select: { assetTag: true }
    })

    const lastNum = lastAsset?.assetTag
      ? parseInt(lastAsset.assetTag.replace("AF-", ""), 10)
      : 0

    const assetTag = `AF-${String(lastNum + 1).padStart(4, "0")}`

    // Create asset
    const asset = await db.asset.create({
      data: {
        ...data,
        assetTag,
        acquisitionDate: new Date(data.acquisitionDate),
        status: "AVAILABLE"
      },
      include: { category: true }
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ASSET_REGISTERED",
        resourceType: "Asset",
        resourceId: asset.id,
        details: JSON.stringify({ assetTag, name: asset.name, category: category.name })
      }
    })

    return NextResponse.json(asset, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Asset creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### Asset Allocation

```typescript
// app/api/allocations/route.ts

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

const allocateSchema = z.object({
  assetId: z.string().cuid(),
  employeeId: z.string().cuid(),
  expectedReturnDate: z.string().datetime().optional()
})

export async function POST(request: NextRequest) {
  const session = await auth()

  // Only ASSET_MANAGER can allocate
  if (!session?.user?.id || session.user.role !== "ASSET_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { assetId, employeeId, expectedReturnDate } = allocateSchema.parse(body)

    // Verify asset exists and is available
    const asset = await db.asset.findUnique({ where: { id: assetId } })
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.status !== "AVAILABLE") {
      return NextResponse.json(
        { 
          error: `Asset is ${asset.status}`,
          suggestion: "Request transfer instead"
        },
        { status: 400 }
      )
    }

    // Verify employee exists
    const employee = await db.user.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Atomic allocation
    const allocation = await db.$transaction(async (tx) => {
      // This will fail with UNIQUE constraint if asset already allocated
      const newAllocation = await tx.allocation.create({
        data: {
          assetId,
          employeeId,
          department: employee.department || undefined,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
          status: "ACTIVE"
        },
        include: { asset: true, employee: true }
      })

      // Update asset status
      await tx.asset.update({
        where: { id: assetId },
        data: { status: "ALLOCATED" }
      })

      // Log history
      await tx.assetStateHistory.create({
        data: {
          assetId,
          fromStatus: "AVAILABLE",
          toStatus: "ALLOCATED",
          reason: `Allocated to ${employee.name}`,
          changedByUserId: session.user.id
        }
      })

      // Create notification
      await tx.notification.create({
        data: {
          userId: employeeId,
          type: "ASSET_ALLOCATED",
          title: `Asset Assigned: ${asset.name}`,
          message: `${asset.name} (${asset.assetTag}) has been allocated to you.`,
          resourceType: "Asset",
          resourceId: assetId
        }
      })

      return newAllocation
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ASSET_ALLOCATED",
        resourceType: "Asset",
        resourceId: assetId,
        details: JSON.stringify({
          assetTag: asset.assetTag,
          allocatedTo: employee.name,
          expectedReturn: expectedReturnDate
        })
      }
    })

    return NextResponse.json(allocation, { status: 201 })

  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === "P2002") {
      const existing = await db.allocation.findFirst({
        where: { assetId: (error.meta?.target || [])[0], status: "ACTIVE" },
        include: { employee: true }
      })

      return NextResponse.json(
        {
          error: "Asset already allocated",
          heldBy: existing?.employee?.name,
          suggestion: "Request transfer instead"
        },
        { status: 409 }
      )
    }

    console.error("Allocation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const status = request.nextUrl.searchParams.get("status") || "ACTIVE"
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1")
    const limit = 50

    let where: any = { status }

    // Employees can only see their own allocations
    if (session.user.role === "EMPLOYEE") {
      where.employeeId = session.user.id
    }
    // Department Heads can see their department's allocations
    else if (session.user.role === "DEPARTMENT_HEAD") {
      where.department = session.user.department
    }
    // ADMIN and ASSET_MANAGER see all

    const allocations = await db.allocation.findMany({
      where,
      include: {
        asset: { include: { category: true } },
        employee: true
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { allocatedAt: "desc" }
    })

    const total = await db.allocation.count({ where })

    return NextResponse.json({
      allocations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })

  } catch (error) {
    console.error("Get allocations error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### Return Asset

```typescript
// app/api/allocations/[id]/return/route.ts

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

const returnSchema = z.object({
  returnCondition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional(),
  returnNotes: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: allocationId } = params
    const body = await request.json()
    const { returnCondition, returnNotes } = returnSchema.parse(body)

    // Get allocation
    const allocation = await db.allocation.findUnique({
      where: { id: allocationId },
      include: { asset: true, employee: true }
    })

    if (!allocation) {
      return NextResponse.json({ error: "Allocation not found" }, { status: 404 })
    }

    // Verify permission (current holder or Asset Manager)
    const isCurrentHolder = session.user.id === allocation.employeeId
    const isAssetManager = session.user.role === "ASSET_MANAGER"
    const isAdmin = session.user.role === "ADMIN"

    if (!isCurrentHolder && !isAssetManager && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Atomic return
    const updatedAllocation = await db.$transaction(async (tx) => {
      // Mark allocation as returned
      const result = await tx.allocation.update({
        where: { id: allocationId },
        data: {
          status: "RETURNED",
          returnedAt: new Date(),
          returnCondition: returnCondition || undefined,
          returnNotes: returnNotes || undefined
        },
        include: { asset: true, employee: true }
      })

      // Update asset status back to available
      await tx.asset.update({
        where: { id: allocation.assetId },
        data: { status: "AVAILABLE" }
      })

      // Log state change
      await tx.assetStateHistory.create({
        data: {
          assetId: allocation.assetId,
          fromStatus: "ALLOCATED",
          toStatus: "AVAILABLE",
          reason: "Asset returned",
          changedByUserId: session.user.id
        }
      })

      // Create notification
      await tx.notification.create({
        data: {
          userId: allocation.employeeId,
          type: "ASSET_RETURNED",
          title: "Asset Return Confirmed",
          message: `${allocation.asset.name} has been returned successfully.`,
          resourceType: "Asset",
          resourceId: allocation.assetId
        }
      })

      return result
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ASSET_RETURNED",
        resourceType: "Asset",
        resourceId: allocation.assetId,
        details: JSON.stringify({
          assetTag: allocation.asset.assetTag,
          returnedBy: allocation.employee.name,
          condition: returnCondition
        })
      }
    })

    return NextResponse.json(updatedAllocation)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Return error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### Booking with Overlap Validation

```typescript
// app/api/bookings/route.ts

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

const bookingSchema = z.object({
  assetId: z.string().cuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  purpose: z.string().optional()
})

async function checkBookingConflict(
  assetId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
) {
  const conflict = await db.booking.findFirst({
    where: {
      assetId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ["UPCOMING", "ONGOING"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    },
    select: { id: true, startTime: true, endTime: true }
  })

  return { hasConflict: !!conflict, conflict }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { assetId, startTime: startTimeStr, endTime: endTimeStr, purpose } = bookingSchema.parse(body)

    const startTime = new Date(startTimeStr)
    const endTime = new Date(endTimeStr)

    // Validate time range
    if (startTime >= endTime) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 })
    }

    // Verify asset exists and is bookable
    const asset = await db.asset.findUnique({ where: { id: assetId } })
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (!asset.isBookable) {
      return NextResponse.json({ error: "Asset is not bookable" }, { status: 400 })
    }

    // Check for conflicts
    const { hasConflict, conflict } = await checkBookingConflict(assetId, startTime, endTime)
    
    if (hasConflict) {
      return NextResponse.json(
        {
          error: "Time slot is already booked",
          conflictingBooking: conflict
        },
        { status: 409 }
      )
    }

    // Create booking
    const booking = await db.booking.create({
      data: {
        assetId,
        employeeId: session.user.id,
        startTime,
        endTime,
        purpose: purpose || "",
        status: "UPCOMING"
      },
      include: { asset: true, employee: true }
    })

    // Create notification
    await db.notification.create({
      data: {
        userId: session.user.id,
        type: "BOOKING_CONFIRMED",
        title: `Booking Confirmed: ${asset.name}`,
        message: `Your booking for ${asset.name} on ${startTime.toDateString()} has been confirmed.`,
        resourceType: "Booking",
        resourceId: booking.id
      }
    })

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "BOOKING_CREATED",
        resourceType: "Booking",
        resourceId: booking.id,
        details: JSON.stringify({
          assetTag: asset.assetTag,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
      }
    })

    return NextResponse.json(booking, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Booking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const assetId = request.nextUrl.searchParams.get("assetId")
    const dateStr = request.nextUrl.searchParams.get("date") // YYYY-MM-DD

    if (!assetId || !dateStr) {
      return NextResponse.json({ error: "Missing assetId or date" }, { status: 400 })
    }

    const dayStart = new Date(`${dateStr}T00:00:00Z`)
    const dayEnd = new Date(`${dateStr}T23:59:59Z`)

    const bookings = await db.booking.findMany({
      where: {
        assetId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { in: ["UPCOMING", "ONGOING"] }
      },
      include: {
        employee: { select: { name: true, email: true } }
      },
      orderBy: { startTime: "asc" }
    })

    return NextResponse.json({ bookings, date: dateStr })

  } catch (error) {
    console.error("Get bookings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### Dashboard KPIs

```typescript
// app/api/dashboard/kpis/route.ts

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [
      totalAssets,
      availableAssets,
      allocatedAssets,
      maintenanceAssets,
      overdueReturns,
      activeBookings,
      maintenanceToday
    ] = await Promise.all([
      db.asset.count(),
      db.asset.count({ where: { status: "AVAILABLE" } }),
      db.asset.count({ where: { status: "ALLOCATED" } }),
      db.asset.count({ where: { status: "UNDER_MAINTENANCE" } }),
      db.allocation.count({
        where: { status: "ACTIVE", expectedReturnDate: { lt: new Date() } }
      }),
      db.booking.count({
        where: { status: { in: ["UPCOMING", "ONGOING"] } }
      }),
      db.maintenanceRequest.count({
        where: {
          createdAt: {
            gte: new Date(new Date().toDateString()),
            lt: new Date(new Date(Date.now() + 86400000).toDateString())
          }
        }
      })
    ])

    const utilization = totalAssets > 0
      ? ((allocatedAssets / totalAssets) * 100).toFixed(1)
      : "0"

    return NextResponse.json({
      assets: {
        total: totalAssets,
        available: availableAssets,
        allocated: allocatedAssets,
        maintenance: maintenanceAssets,
        utilization: `${utilization}%`
      },
      alerts: {
        overdueReturns,
        activeBookings,
        maintenanceToday
      }
    })

  } catch (error) {
    console.error("KPI error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

---

## 4. ERROR HANDLING PATTERNS

### Standard Error Responses

```typescript
// lib/apiErrors.ts

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message)
  }
}

export function errorResponse(error: any) {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        ...(error.details && { details: error.details })
      }),
      { status: error.status }
    )
  }

  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: error.errors }),
      { status: 400 }
    )
  }

  console.error("Unhandled error:", error)
  return new Response(
    JSON.stringify({ error: "Internal server error" }),
    { status: 500 }
  )
}
```

### Usage

```typescript
export async function POST(request: Request) {
  try {
    // ... handler code
  } catch (error) {
    return errorResponse(error)
  }
}
```

---

## 5. VALIDATION SCHEMAS

```typescript
// lib/schemas.ts

import { z } from "zod"

export const assetSchema = z.object({
  name: z.string().min(1, "Asset name required"),
  categoryId: z.string().cuid("Invalid category"),
  serialNumber: z.string(),
  acquisitionDate: z.coerce.date(),
  acquisitionCost: z.number().positive("Cost must be positive"),
  location: z.string().optional(),
  isBookable: z.boolean().optional()
})

export const allocationSchema = z.object({
  assetId: z.string().cuid(),
  employeeId: z.string().cuid(),
  expectedReturnDate: z.coerce.date().optional()
})

export const bookingSchema = z.object({
  assetId: z.string().cuid(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  purpose: z.string().optional()
})
```

---

## 6. TESTING ENDPOINTS

### Using cURL

```bash
# Register asset
curl -X POST http://localhost:3000/api/assets \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{
    "name": "MacBook Pro",
    "categoryId": "cat_123",
    "serialNumber": "ABC123",
    "acquisitionDate": "2024-01-01T00:00:00Z",
    "acquisitionCost": 2500
  }'

# Allocate asset
curl -X POST http://localhost:3000/api/allocations \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{
    "assetId": "asset_123",
    "employeeId": "emp_456"
  }'

# Create booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_cookie>" \
  -d '{
    "assetId": "room_789",
    "startTime": "2024-01-15T09:00:00Z",
    "endTime": "2024-01-15T10:00:00Z"
  }'
```

---

This guide provides complete API implementation patterns for AssetFlow.
