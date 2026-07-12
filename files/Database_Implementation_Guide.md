# AssetFlow Database Implementation Guide

Complete guide for implementing the Prisma schema with migrations, critical constraints, and example queries.

---

## 1. SCHEMA INITIALIZATION

### Step 1: Initialize Prisma

```bash
npm install @prisma/client prisma

npx prisma init
```

### Step 2: Configure .env.local

```
DATABASE_URL="postgresql://user:password@localhost:5432/assetflow"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

### Step 3: Create Migrations

```bash
# Copy the schema from prisma_schema.prisma to prisma/schema.prisma

# Create migration
npx prisma migrate dev --name init

# Deploy migration to production
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

---

## 2. CRITICAL CONSTRAINTS & INDEXES

### Migration: Create Unique Allocation Constraint

```sql
-- This prevents double-allocation: only ONE active allocation per asset

-- Migration: 2024-01-15_create_unique_active_allocation.sql

CREATE UNIQUE INDEX one_active_allocation_per_asset 
  ON "Allocation"("assetId") 
  WHERE status = 'ACTIVE';

-- This index forces the constraint at database level
-- Any INSERT/UPDATE attempting duplicate active allocation fails with UNIQUE violation
```

### Migration: Booking Overlap Index

```sql
-- Critical for fast overlap detection in booking validation

CREATE INDEX booking_overlap_check 
  ON "Booking"(
    "assetId", 
    "startTime", 
    "endTime", 
    "status"
  ) 
  WHERE status IN ('UPCOMING', 'ONGOING');

-- This allows the database query to quickly find overlapping bookings
-- Query: startTime < NEW_END AND endTime > NEW_START
-- Without this index: O(n) scan of all bookings
-- With this index: O(log n) + ~5 rows returned
```

### Migration: Overdue Detection Index

```sql
-- Fast detection of overdue allocations for dashboard

CREATE INDEX allocation_overdue_check 
  ON "Allocation"("expectedReturnDate") 
  WHERE status = 'ACTIVE' AND "expectedReturnDate" IS NOT NULL;

-- Enables fast query:
-- SELECT COUNT(*) FROM "Allocation" 
--   WHERE status = 'ACTIVE' AND "expectedReturnDate" < NOW()
```

### Migration: Asset Status Filtering

```sql
-- Fast asset status lookups

CREATE INDEX asset_status_index 
  ON "Asset"("status");

-- Enables: SELECT COUNT(*) FROM "Asset" WHERE status = 'AVAILABLE'
```

---

## 3. EXAMPLE QUERIES

### Query 1: Check Booking Overlap

```typescript
// lib/bookingValidation.ts

export async function checkBookingConflict(
  assetId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<{ hasConflict: boolean; conflicting?: any }> {
  // Find any booking that overlaps with the new time slot
  const conflict = await db.booking.findFirst({
    where: {
      assetId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ["UPCOMING", "ONGOING"] },
      // Two bookings overlap if:
      // Conflict starts BEFORE new end AND ends AFTER new start
      startTime: { lt: endTime },    // existing.startTime < newEndTime
      endTime: { gt: startTime }     // existing.endTime > newStartTime
    },
    select: { id: true, startTime: true, endTime: true }
  })

  return {
    hasConflict: !!conflict,
    conflicting: conflict || undefined
  }
}

// Test cases:
// New: 9:00-10:00
//   Existing: 9:00-10:00 → OVERLAP (same time)
//   Existing: 8:00-9:00 → NO OVERLAP (ends at our start)
//   Existing: 10:00-11:00 → NO OVERLAP (starts at our end)
//   Existing: 9:30-10:30 → OVERLAP (partial overlap)
```

### Query 2: Allocate Asset (Race Condition Safe)

```typescript
// app/api/allocations/route.ts

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ASSET_MANAGER") {
    return new Response("Forbidden", { status: 403 })
  }

  const { assetId, employeeId, expectedReturnDate } = await request.json()

  // Validate inputs
  if (!assetId || !employeeId) {
    return new Response("Missing fields", { status: 400 })
  }

  try {
    // Step 1: Check asset exists and is available
    const asset = await db.asset.findUnique({
      where: { id: assetId }
    })

    if (!asset) {
      return new Response("Asset not found", { status: 404 })
    }

    if (asset.status !== "AVAILABLE") {
      return new Response(`Asset is ${asset.status}`, { status: 400 })
    }

    // Step 2: Check employee exists
    const employee = await db.user.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return new Response("Employee not found", { status: 404 })
    }

    // Step 3: Try to create allocation
    // This will FAIL if there's an active allocation (UNIQUE constraint)
    const allocation = await db.allocation.create({
      data: {
        assetId,
        employeeId,
        department: employee.department || undefined,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
        status: "ACTIVE"
      },
      include: { asset: true, employee: true }
    })

    // Step 4: Update asset status
    await db.asset.update({
      where: { id: assetId },
      data: { status: "ALLOCATED" }
    })

    // Step 5: Log activity
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

    // Step 6: Create notification
    await db.notification.create({
      data: {
        userId: employeeId,
        type: "ASSET_ALLOCATED",
        title: `Asset Allocated: ${asset.name}`,
        message: `${asset.name} (${asset.assetTag}) has been allocated to you.`,
        resourceType: "Asset",
        resourceId: assetId
      }
    })

    return new Response(JSON.stringify(allocation), { status: 201 })

  } catch (error: any) {
    // Handle unique constraint violation (double allocation attempt)
    if (error.code === "P2002" && error.meta?.target?.includes("one_active_allocation_per_asset")) {
      // Asset is already allocated, suggest transfer instead
      const existing = await db.allocation.findFirst({
        where: { assetId, status: "ACTIVE" },
        include: { employee: true }
      })
      return new Response(
        JSON.stringify({
          error: "Asset already allocated",
          heldBy: existing?.employee?.name,
          suggestion: "Request transfer instead"
        }),
        { status: 409 }
      )
    }

    console.error("Allocation error:", error)
    return new Response("Failed to allocate", { status: 500 })
  }
}
```

### Query 3: Return Asset

```typescript
// app/api/allocations/[id]/return/route.ts

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { id: allocationId } = params
  const { returnCondition, returnNotes } = await request.json()

  try {
    // Step 1: Get allocation
    const allocation = await db.allocation.findUnique({
      where: { id: allocationId },
      include: { asset: true, employee: true }
    })

    if (!allocation) {
      return new Response("Allocation not found", { status: 404 })
    }

    // Step 2: Verify current holder or Asset Manager can return
    const isCurrentHolder = session.user.id === allocation.employeeId
    const isAssetManager = session.user.role === "ASSET_MANAGER"

    if (!isCurrentHolder && !isAssetManager) {
      return new Response("Not authorized to return this asset", { status: 403 })
    }

    // Step 3: Mark allocation as returned
    await db.allocation.update({
      where: { id: allocationId },
      data: {
        status: "RETURNED",
        returnedAt: new Date(),
        returnCondition: returnCondition || undefined,
        returnNotes: returnNotes || undefined
      }
    })

    // Step 4: Update asset status back to Available
    await db.asset.update({
      where: { id: allocation.assetId },
      data: { status: "AVAILABLE" }
    })

    // Step 5: Log state history
    await db.assetStateHistory.create({
      data: {
        assetId: allocation.assetId,
        fromStatus: "ALLOCATED",
        toStatus: "AVAILABLE",
        reason: "Asset returned",
        changedByUserId: session.user.id
      }
    })

    // Step 6: Create notification
    await db.notification.create({
      data: {
        userId: allocation.employeeId,
        type: "ASSET_RETURNED",
        title: "Asset Return Confirmed",
        message: `${allocation.asset.name} has been returned successfully.`,
        resourceType: "Asset",
        resourceId: allocation.assetId
      }
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (error) {
    console.error("Return error:", error)
    return new Response("Failed to return asset", { status: 500 })
  }
}
```

### Query 4: Get Dashboard KPIs

```typescript
// lib/dashboard.ts

export async function getDashboardKPIs() {
  const [
    totalAssets,
    availableAssets,
    allocatedAssets,
    maintenanceAssets,
    overdueReturns,
    activeBookings,
    maintenanceToday
  ] = await Promise.all([
    // Count assets by status
    db.asset.count(),
    db.asset.count({ where: { status: "AVAILABLE" } }),
    db.asset.count({ where: { status: "ALLOCATED" } }),
    db.asset.count({ where: { status: "UNDER_MAINTENANCE" } }),

    // Count overdue returns
    db.allocation.count({
      where: {
        status: "ACTIVE",
        expectedReturnDate: { lt: new Date() }
      }
    }),

    // Count active bookings (upcoming or ongoing)
    db.booking.count({
      where: {
        status: { in: ["UPCOMING", "ONGOING"] }
      }
    }),

    // Maintenance requests today
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

  return {
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
  }
}
```

### Query 5: Get Overdue Allocations

```typescript
// lib/overdue.ts

export async function getOverdueAllocations() {
  const now = new Date()
  
  return await db.allocation.findMany({
    where: {
      status: "ACTIVE",
      expectedReturnDate: { lt: now }
    },
    include: {
      asset: {
        select: {
          assetTag: true,
          name: true
        }
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { expectedReturnDate: "asc" }
  })
}

// Usage in job/cron:
// export async function notifyOverdueReturns() {
//   const overdue = await getOverdueAllocations()
//   for (const item of overdue) {
//     await db.notification.create({
//       userId: item.employeeId,
//       type: "ASSET_OVERDUE",
//       message: `${item.asset.name} was due back on ${item.expectedReturnDate.toDateString()}`
//     })
//     // Send email...
//   }
// }
```

### Query 6: Get Asset with Full History

```typescript
// lib/assetDetails.ts

export async function getAssetWithHistory(assetId: string) {
  const asset = await db.asset.findUnique({
    where: { id: assetId },
    include: {
      category: true,
      allocations: {
        orderBy: { allocatedAt: "desc" },
        take: 10,
        include: {
          employee: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      bookings: {
        where: { status: { in: ["UPCOMING", "ONGOING"] } },
        orderBy: { startTime: "asc" },
        take: 5
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      stateHistory: {
        orderBy: { changedAt: "desc" },
        take: 20,
        include: {
          changedByUser: {
            select: { name: true }
          }
        }
      }
    }
  })

  return asset
}
```

### Query 7: Search Assets

```typescript
// lib/assetSearch.ts

export async function searchAssets(query: string, filters: {
  status?: string
  category?: string
  location?: string
  department?: string
}) {
  return await db.asset.findMany({
    where: {
      OR: [
        { assetTag: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { serialNumber: { contains: query, mode: "insensitive" } },
        { location: { contains: query, mode: "insensitive" } }
      ],
      ...(filters.status && { status: filters.status }),
      ...(filters.category && { category: { name: filters.category } }),
      ...(filters.location && { location: { contains: filters.location } })
    },
    include: { category: true },
    take: 50
  })
}
```

### Query 8: Get Bookings for Calendar View

```typescript
// lib/bookingCalendar.ts

export async function getBookingsForAsset(
  assetId: string,
  dateRange: { start: Date; end: Date }
) {
  return await db.booking.findMany({
    where: {
      assetId,
      startTime: { gte: dateRange.start },
      endTime: { lte: dateRange.end },
      status: { in: ["UPCOMING", "ONGOING"] }
    },
    include: {
      employee: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { startTime: "asc" }
  })
}
```

---

## 4. DATA RELATIONSHIPS DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ id, email, name, role (ADMIN/ASSET_MANAGER/...)    │   │
│  │ department, status, createdAt, lastLoginAt         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ├──────────────────┬─┴──────────┬────────┤
         │                  │            │        │
    allocations        bookings    maintenance   transfers
         │                  │            │        │
         ▼                  ▼            ▼        ▼
┌──────────────────┐ ┌─────────┐ ┌─────────────────┐ ┌──────────┐
│ ALLOCATION       │ │ BOOKING │ │ MAINTENANCE_    │ │ TRANSFER │
│                  │ │         │ │ REQUEST         │ │ REQUEST  │
│ assetId ──────┐  │ │ assetId │ │ assetId ────────┼─│ assetId  │
│ employeeId    │  │ │         │ │                 │ │          │
│ status        │  │ │ startTime │ priority        │ │ status   │
│ expectedRtn   │  │ │ endTime │ │ description     │ │          │
│ returnedAt    │  │ │ status  │ │ status          │ │ approved │
│ returnNotes   │  │ │ purpose │ │                 │ │ by       │
└──────────────────┘ └─────────┘ └─────────────────┘ └──────────┘
         │                  │            │
         └──────────────────┴────────────┤
                            │
                            ▼
                     ┌─────────────────┐
                     │ ASSET           │
                     │                 │
                     │ assetTag (UNIQUE)
                     │ name            │
                     │ categoryId ─────┼──┐
                     │ status          │  │
                     │ condition       │  │
                     │ location        │  │
                     │ isBookable      │  │
                     │ photoUrl        │  │
                     │ warrantyExpiry  │  │
                     └─────────────────┘  │
                             │            │
                             │            ▼
                             │     ┌────────────────┐
                             │     │ ASSET_CATEGORY │
                             │     │                │
                             │     │ name (UNIQUE)  │
                             │     │ customFields   │
                             └────►└────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ASSET HISTORY TABLES (Audit Trail)                          │
├─────────────────────────────────────────────────────────────┤
│ ASSET_STATE_HISTORY: Tracks status changes (Available→Allocated)
│ ACTIVITY_LOG: All user actions (who, what, when)
│ NOTIFICATION: User notifications (read/unread)
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AUDIT CYCLE WORKFLOW                                        │
├─────────────────────────────────────────────────────────────┤
│ AUDIT_CYCLE
│   ├─ status: CREATED → IN_PROGRESS → CLOSED
│   │
│   ├─ AUDIT_ITEM (many per cycle)
│   │    assetId, status (VERIFIED/MISSING/DAMAGED)
│   │
│   └─ AUDIT_DISCREPANCY (auto-generated for issues)
│        category (Missing/Damaged), severity
└─────────────────────────────────────────────────────────────┘
```

---

## 5. TRANSACTION EXAMPLES

### Transaction: Atomic Allocation

```typescript
// This ensures allocation and asset update happen together or not at all

export async function allocateAssetAtomic(
  assetId: string,
  employeeId: string,
  expectedReturnDate?: Date
) {
  return await db.$transaction(async (tx) => {
    // Step 1: Verify asset
    const asset = await tx.asset.findUnique({
      where: { id: assetId }
    })

    if (!asset || asset.status !== "AVAILABLE") {
      throw new Error("Asset not available")
    }

    // Step 2: Create allocation (with unique constraint)
    const allocation = await tx.allocation.create({
      data: {
        assetId,
        employeeId,
        expectedReturnDate,
        status: "ACTIVE"
      }
    })

    // Step 3: Update asset
    const updatedAsset = await tx.asset.update({
      where: { id: assetId },
      data: { status: "ALLOCATED" }
    })

    // Step 4: Log history
    await tx.assetStateHistory.create({
      data: {
        assetId,
        fromStatus: "AVAILABLE",
        toStatus: "ALLOCATED",
        changedByUserId: "current-user-id"
      }
    })

    return allocation
  })
}

// If any step fails, entire transaction rolls back
// If step 2 fails (UNIQUE violation), steps 3-4 don't execute
```

---

## 6. SEED DATA SCRIPT

```typescript
// prisma/seed.ts

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create departments
  const itDept = await prisma.department.create({
    data: {
      name: "IT Department",
      description: "Information Technology"
    }
  })

  const hrDept = await prisma.department.create({
    data: {
      name: "HR Department",
      description: "Human Resources"
    }
  })

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: "admin@assetflow.com",
      name: "Admin User",
      passwordHash: await bcrypt.hash("Admin123!", 10),
      role: "ADMIN"
    }
  })

  const assetManager = await prisma.user.create({
    data: {
      email: "manager@assetflow.com",
      name: "Asset Manager",
      passwordHash: await bcrypt.hash("Manager123!", 10),
      role: "ASSET_MANAGER",
      department: itDept.name
    }
  })

  const employee1 = await prisma.user.create({
    data: {
      email: "priya@assetflow.com",
      name: "Priya Shah",
      passwordHash: await bcrypt.hash("Employee123!", 10),
      role: "EMPLOYEE",
      department: itDept.name
    }
  })

  const employee2 = await prisma.user.create({
    data: {
      email: "raj@assetflow.com",
      name: "Raj Kumar",
      passwordHash: await bcrypt.hash("Employee123!", 10),
      role: "EMPLOYEE",
      department: hrDept.name
    }
  })

  // Create asset categories
  const laptopCategory = await prisma.assetCategory.create({
    data: {
      name: "Laptop",
      description: "Portable computers"
    }
  })

  const roomCategory = await prisma.assetCategory.create({
    data: {
      name: "Conference Room",
      description: "Meeting spaces"
    }
  })

  // Create assets
  const laptop1 = await prisma.asset.create({
    data: {
      assetTag: "AF-0001",
      name: "MacBook Pro 16",
      categoryId: laptopCategory.id,
      serialNumber: "C02GQ3JQMD6Y",
      status: "AVAILABLE",
      location: "Building A, Floor 2",
      acquisitionDate: new Date("2023-01-15"),
      acquisitionCost: 2500
    }
  })

  const laptop2 = await prisma.asset.create({
    data: {
      assetTag: "AF-0002",
      name: "Dell XPS 15",
      categoryId: laptopCategory.id,
      serialNumber: "D123456789",
      status: "AVAILABLE",
      location: "Building A, Floor 2",
      acquisitionDate: new Date("2023-06-20"),
      acquisitionCost: 1800
    }
  })

  const room1 = await prisma.asset.create({
    data: {
      assetTag: "AF-0003",
      name: "Conference Room B",
      categoryId: roomCategory.id,
      serialNumber: "CR-001",
      status: "AVAILABLE",
      location: "Building A, Floor 3",
      isBookable: true,
      acquisitionDate: new Date("2022-01-01"),
      acquisitionCost: 50000
    }
  })

  console.log("✅ Database seeded successfully")
  console.log(`✅ Admin: admin@assetflow.com / Admin123!`)
  console.log(`✅ Manager: manager@assetflow.com / Manager123!`)
  console.log(`✅ Employee: priya@assetflow.com / Employee123!`)
  console.log(`✅ ${3} assets created`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## 7. PERFORMANCE OPTIMIZATION CHECKLIST

- [ ] Booking overlap index created (critical for fast detection)
- [ ] Allocation unique constraint on (assetId, status='ACTIVE')
- [ ] Asset status index for dashboard queries
- [ ] Overdue detection index on expectedReturnDate
- [ ] Activity log indexed on userId, action, createdAt
- [ ] Queries use `select` to avoid fetching all fields
- [ ] Pagination implemented for large lists (take: 50)
- [ ] KPI queries parallelized with `Promise.all()`
- [ ] Notifications lazy-loaded (don't fetch all on user load)
- [ ] Caching strategy: KPI snapshot cached 5 min

---

## 8. COMMON PITFALLS

| Issue | Solution |
|-------|----------|
| Double allocation despite check | Use DB UNIQUE constraint, not app logic |
| Booking overlap edge cases | Use `<` and `>` comparisons (half-open intervals) |
| Timezone bugs in bookings | Always store UTC, display in user's timezone |
| Asset status inconsistent | Validate state transitions server-side only |
| Slow KPI dashboard | Parallelize queries, cache results |
| Lost allocation history | Implement assetStateHistory table |
| Missing audit trail | Log every action in activityLog |
| N+1 query problem | Use `include` to fetch related data once |

---

## 9. MIGRATION WORKFLOW

### For Development

```bash
# Make schema change
# Run locally
npx prisma migrate dev --name <description>

# This creates a migration file + applies it
```

### For Production

```bash
# Create migration (not applied)
npx prisma migrate dev --name <description> --create-only

# Review migration file in prisma/migrations/

# Deploy to production
npx prisma migrate deploy

# If migration fails, use reset (WARNING: data loss)
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## 10. BACKUP & RECOVERY

### Daily Backup

```bash
pg_dump assetflow_production > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
psql assetflow_production < backup_20240115.sql
```

---

This completes the comprehensive database implementation guide for AssetFlow.
