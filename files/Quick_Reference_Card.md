# AssetFlow: Quick Reference Card
**Print this for the 8-hour hackathon sprint**

---

## SCHEMA QUICK LOOKUP

### User Roles
```
ADMIN → Manage departments, categories, promote users
ASSET_MANAGER → Register, allocate, approve maintenance
DEPARTMENT_HEAD → View department assets, approve transfers
EMPLOYEE → View own allocations, book resources, raise requests
```

### Asset Statuses
```
AVAILABLE → Ready to allocate
ALLOCATED → Currently held
RESERVED → Pending allocation
UNDER_MAINTENANCE → Being repaired
LOST → Missing
RETIRED → End-of-life
DISPOSED → Scrapped
```

### Allocation Statuses
```
ACTIVE → Currently allocated
RETURNED → User returned it
PAUSED → Temporarily paused (e.g., under maintenance)
CANCELLED → Transfer cancelled
```

### Booking Statuses
```
UPCOMING → Scheduled for future
ONGOING → Currently happening
COMPLETED → Finished
CANCELLED → User cancelled
NO_SHOW → Booked but no-show
```

### Maintenance Statuses
```
PENDING → Waiting for approval
APPROVED → Ready for work
REJECTED → Not approved
IN_PROGRESS → Being worked on
COMPLETED → Fixed
CANCELLED → Cancelled
```

---

## CRITICAL CONSTRAINTS

### ⚠️ UNIQUE CONSTRAINT (Race Condition Prevention)
```sql
CREATE UNIQUE INDEX one_active_allocation_per_asset 
  ON "Allocation"("assetId") WHERE status = 'ACTIVE';
```
**What it does:** Prevents allocating same asset to 2 people
**Error code:** P2002 (unique_violation)
**Handle in API:** Return 409, show "held by X"

### ⚠️ BOOKING OVERLAP INDEX
```sql
CREATE INDEX booking_overlap_check ON "Booking"
  (assetId, startTime, endTime, status);
```
**Query pattern:**
```
startTime < NEW_END AND endTime > NEW_START
```

### ⚠️ ASSET TAG UNIQUENESS
```sql
@unique on assetTag
```
**Auto-generate:** AF-0001, AF-0002, etc.

---

## ONE-LINER API PATTERNS

### Check Booking Overlap
```typescript
const conflict = await db.booking.findFirst({
  where: { assetId, startTime: { lt: endTime }, endTime: { gt: startTime }, status: { in: ['UPCOMING', 'ONGOING'] } }
})
```

### Allocate Asset (Atomic)
```typescript
const allocation = await db.allocation.create({
  data: { assetId, employeeId, status: 'ACTIVE' }
}) // Fails with P2002 if already allocated
```

### Get KPIs (Parallel)
```typescript
const [total, available, allocated, maintenance] = await Promise.all([
  db.asset.count(), db.asset.count({where:{status:'AVAILABLE'}}), ...
])
```

### Get Overdue Returns
```typescript
await db.allocation.count({
  where: { status: 'ACTIVE', expectedReturnDate: { lt: new Date() } }
})
```

---

## QUICK SETUP (First 30 Min)

```bash
# Create project
npx create-next-app@latest assetflow --ts --tailwind

# Install core
npm install @prisma/client prisma next-auth zod papaparse

# Init DB
npx prisma init

# Copy schema file to prisma/schema.prisma

# Create migration
npx prisma migrate dev --name init

# Start dev
npm run dev
```

---

## ENDPOINT CHECKLIST

### Assets
- [ ] POST /api/assets → Register (auto-generate tag)
- [ ] GET /api/assets → List (with status filter)
- [ ] GET /api/assets/[id] → Details
- [ ] PUT /api/assets/[id] → Update

### Allocations
- [ ] POST /api/allocations → Allocate (with conflict check)
- [ ] GET /api/allocations → List (role-based filter)
- [ ] POST /api/allocations/[id]/return → Return asset

### Bookings
- [ ] POST /api/bookings → Create (overlap validation)
- [ ] GET /api/bookings?assetId=&date= → Calendar view
- [ ] DELETE /api/bookings/[id] → Cancel

### Dashboard
- [ ] GET /api/dashboard/kpis → KPIs
- [ ] GET /api/dashboard/overdue → Overdue returns

### Reports
- [ ] GET /api/reports/assets → CSV export
- [ ] GET /api/reports/allocations → CSV export

---

## ERROR CODES

| Code | Meaning | Response |
|------|---------|----------|
| 201 | Created | New resource |
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | No session |
| 403 | Forbidden | Wrong role |
| 404 | Not Found | Resource missing |
| 409 | Conflict | UNIQUE violation (double-allocate, overlap) |
| 500 | Server Error | Exception |

---

## ROLE-BASED ROUTES

### Admin Only
- /api/organization/departments
- /api/organization/categories
- /api/organization/employees

### Asset Manager + Admin
- /api/assets (POST)
- /api/allocations (POST)
- /api/maintenance/[id]/approve
- /api/allocations/[id]/transfer/approve

### Department Head + Manager + Admin
- /api/bookings (POST)
- /api/maintenance (POST)
- /api/allocations (GET)

### Everyone
- /api/allocations (GET own only for EMPLOYEE)
- /api/bookings (GET own)
- /api/dashboard/kpis
- /api/dashboard/notifications

---

## COMMON BUGS & FIXES

| Bug | Fix |
|-----|-----|
| Double-allocation succeeds | Add UNIQUE constraint at DB level, catch P2002 |
| Booking overlap misses edge | Use `<` and `>`, not `<=` and `>=` |
| Asset status inconsistent | Validate transitions server-side only |
| Slow dashboard | Parallelize KPI queries with Promise.all() |
| Lost allocation history | Implement assetStateHistory table |
| N+1 query problem | Use `include` in Prisma, not separate queries |
| Timezone bugs | Store UTC always, display in user TZ |

---

## MIGRATION COMMANDS

```bash
# During development
npx prisma migrate dev --name <description>

# Create only (don't apply)
npx prisma migrate dev --name <description> --create-only

# Deploy to production
npx prisma migrate deploy

# Reset (⚠️ DATA LOSS!)
npx prisma migrate reset
```

---

## SEED DATA

```typescript
// prisma/seed.ts
const admin = await prisma.user.create({
  data: {
    email: "admin@assetflow.com",
    name: "Admin",
    passwordHash: await bcrypt.hash("Admin123!", 10),
    role: "ADMIN"
  }
})

// Then: npx prisma db seed
```

---

## TESTING QUICK HITS

```typescript
// Test double-allocation
try {
  await allocate(asset1, emp1)
  await allocate(asset1, emp2) // Should fail
} catch (e) {
  assert(e.code === 'P2002')
}

// Test booking overlap
await checkOverlap('room1', 9:00, 10:30) // Should fail if 9:00-10:00 exists
await checkOverlap('room1', 10:00, 11:00) // Should pass (adjacent OK)

// Test KPIs match DB
const kpis = await getKPIs()
assert(kpis.allocated === await db.asset.count({where:{status:'ALLOCATED'}}))
```

---

## VERCEL DEPLOYMENT

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars in Vercel dashboard:
# - DATABASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL=https://assetflow.vercel.app
```

---

## DEMO SCRIPT (4 Min)

```
1. Login as Asset Manager (30 sec)
2. Show dashboard KPIs (30 sec)
3. Register asset "Laptop AF-0005" (30 sec)
4. Allocate to "Priya" (1 min)
   → Show "Available" count decreased
5. Try allocate to "Raj" → Show "already held by Priya" (30 sec)
6. Book room: 9:00-10:00 ✓, 9:30-10:30 ✗, 10:00-11:00 ✓ (1 min)
7. Return asset to Priya (30 sec)
8. Download CSV report (30 sec)

Total: 4 min ✅
```

---

## STACK REFERENCE

```
Frontend: Next.js 14, React 18, Tailwind, shadcn/ui
Backend: Next.js API Routes
Auth: NextAuth.js v5
DB: PostgreSQL (Neon)
ORM: Prisma
Validation: Zod
Reports: PapaParse
Deployment: Vercel
```

---

## SLACK MESSAGE FOR TEAM

```
🚀 AssetFlow 8-Hour Sprint

TIMELINE:
Hour 1-2: Boilerplate + Auth
Hour 2-3: Asset CRUD
Hour 3-4: Allocation (race condition prevention!)
Hour 4-5: Booking (overlap validation)
Hour 5-6: Dashboard KPIs
Hour 6-7: Polish + Maintenance form
Hour 7-8: Deploy + Demo

CRITICAL:
✅ UNIQUE constraint prevents double-allocation
✅ Index on (assetId, startTime, endTime) for fast overlap check
✅ Parallel KPI queries (Promise.all)
✅ Transactions for multi-step operations

IF BEHIND SCHEDULE:
- Skip transfers, skip audit cycles
- Keep auth, assets, allocation, return, booking, dashboard
- Deploy working v0.5 instead of broken v1.0

DOCS:
- Prisma schema: prisma_schema.prisma
- API patterns: API_Route_Structure_Guide.md
- DB queries: Database_Implementation_Guide.md
```

---

## LAST 30 MINUTES

- [ ] Clear console errors
- [ ] Test all 3 roles login
- [ ] Allocate asset end-to-end
- [ ] Test booking overlap (9-10, 9:30-10:30 = error, 10-11 = ok)
- [ ] Export CSV
- [ ] Responsive mobile test
- [ ] Deploy to Vercel
- [ ] Practice demo script

---

**Print this card. Tape to monitor. Reference constantly. 🚀**
