# AssetFlow — Master Reference Document
**Enterprise Asset & Resource Management System — Hackathon Build (6-hour team sprint)**

This is the single source of truth: what to build, in what order, with what data model, and what it should look like. It merges the problem statement, your uploaded schema/API/DB docs, and everything decided in this conversation.

---

## 1. Feature list — compulsory vs extra

### Compulsory (directly from the problem statement — build all of these)

| # | Feature | Core requirement |
|---|---|---|
| 1 | **Auth & Roles** | Signup creates Employee only; Admin promotes to Dept Head / Asset Manager from directory; login/logout/session |
| 2 | **Organization Setup** | Departments (hierarchy, head), Asset Categories, Employee Directory — Admin only |
| 3 | **Asset Registration & Directory** | Register with auto tag (AF-0001), lifecycle status, search/filter, per-asset history |
| 4 | **Allocation + conflict block** | Allocate to employee/department; **block double-allocation**; transfer request flow; return flow |
| 5 | **Resource Booking + overlap block** | Time-slot booking; **reject overlapping bookings**, accept adjacent ones |
| 6 | **Maintenance workflow** | Raise → Approve/Reject → In Progress → Resolved; auto status flip on asset |
| 7 | **Dashboard** | Real KPI cards (not hardcoded), overdue items flagged separately |
| 8 | **Notifications / Activity Log** | Event feed — who did what, when |

These 8 map 1:1 to the problem statement's screens 1–7 + part of 10. Cover them fully and you've satisfied every explicit requirement in the PDF.

### Extra (differentiators — pick 2–3, don't spread thin)

- **QR code per asset** — spec explicitly mentions QR search; visually strong live demo moment
- **Audit cycle (minimal)** — create cycle, mark Verified/Missing/Damaged, auto-flag discrepancy — most teams will skip this entirely
- **CSV export** — one real report (e.g. department allocation summary), not all of Reports & Analytics
- **Real-time notification toast** — Supabase/DB event → live badge update during demo
- **Polished conflict UX** — modal showing current holder + one-click "Request Transfer" instead of a bare error

### Cut for the 6-hour window
Full Reports & Analytics module, deep audit history, multi-language, mobile app. Mention them as "next steps" in the pitch — don't build them.

---

## 2. Database — entity roles and critical constraints

Your `prisma_schema.prisma` is already production-grade (15+ models). Here's what each table is *for*, and the two constraints that do the hardest work in the whole system.

### Core tables

| Table | Role |
|---|---|
| `User` | Identity + `role` enum (ADMIN / ASSET_MANAGER / DEPARTMENT_HEAD / EMPLOYEE) |
| `Department` | Org hierarchy via `parentDepartmentId`, has a head |
| `AssetCategory` | Category master data, `customFields` JSON for category-specific fields |
| `Asset` | Core entity — `assetTag` (unique), `status` enum, `isBookable` flag |
| `Allocation` | **Not a mutable field on Asset** — append-log style, one row per holding period. Current holder = row with `status = ACTIVE` |
| `TransferRequest` | Requested → Approved → Completed, linked to the `Allocation` it replaces |
| `Booking` | Resource + time range + status, indexed on `(assetId, startTime, endTime, status)` |
| `MaintenanceRequest` | Asset + workflow status + approver + technician |
| `AuditCycle` / `AuditItem` | Cycle metadata + per-asset verification result |
| `AssetStateHistory` | Every status transition logged — this is what powers "per-asset history" |
| `ActivityLog` / `Notification` | Who did what, when; per-user alerts |

### The two constraints that matter most

**1. Double-allocation block** — database-enforced, not just app logic:
```sql
CREATE UNIQUE INDEX one_active_allocation_per_asset
  ON "Allocation"("assetId") WHERE status = 'ACTIVE';
```
Prisma schema equivalent: `@@unique([assetId, status], where: { status: "ACTIVE" })`. A second `INSERT` fails instantly at the DB layer (Prisma error `P2002`) — no race condition possible even under concurrent requests. App just catches the error and shows "currently held by X."

**2. Booking overlap block** — index for speed, app-level range check for logic:
```sql
CREATE INDEX booking_overlap_check ON "Booking"(assetId, startTime, endTime, status);
```
```typescript
const conflict = await db.booking.findFirst({
  where: {
    assetId,
    status: { in: ['UPCOMING', 'ONGOING'] },
    startTime: { lt: newEndTime },
    endTime: { gt: newStartTime }
  }
});
```
Half-open interval logic: `existingStart < newEnd AND existingEnd > newStart`. This is why 9:00–10:00 blocks 9:30–10:30 but allows 10:00–11:00 (touching, not overlapping). If you want this fully race-proof at the DB level too (not just app-checked), an `EXCLUDE USING gist` constraint with `btree_gist` is the Postgres-native way — worth mentioning in your pitch even if you only implement the app-level check in 6 hours.

**3. Asset tag uniqueness** — `@unique` on `assetTag`, auto-generated as `AF-0001`, `AF-0002`... by reading the last tag and incrementing.

**4. Audit uniqueness** — `@@unique([auditCycleId, assetId])` — each asset audited once per cycle, if you build the audit feature.

---

## 3. System flow

The diagram below shows the full lifecycle end-to-end — this is the mental model for your whole build.

---

## 4. API route structure (summary)

```
/api/auth/*                        signup, login, session
/api/organization/departments      Admin only
/api/organization/categories       Admin only
/api/organization/employees        Admin only (+ role promotion)

/api/assets            POST (register), GET (list/filter), GET [id], PUT [id]
/api/allocations        POST (allocate, conflict-checked), GET (role-filtered), POST [id]/return
/api/allocations/[id]/transfer/request   POST
/api/allocations/[id]/transfer/approve   POST   — Asset Manager / Dept Head

/api/bookings           POST (overlap-checked), GET ?assetId=&date=, DELETE [id]
/api/maintenance        POST (raise), POST [id]/approve, POST [id]/reject, POST [id]/resolve

/api/dashboard/kpis         GET — parallelized counts
/api/dashboard/overdue      GET
/api/dashboard/notifications GET

/api/reports/assets         GET — CSV export
/api/reports/allocations    GET — CSV export
```

**Role gating** (enforce server-side, never trust the client):
- Admin only: organization setup routes
- Asset Manager + Admin: asset registration, allocation, maintenance approval, transfer approval
- Department Head + Asset Manager + Admin: booking creation, maintenance raise, allocations list (dept-scoped)
- Everyone: own allocations/bookings, dashboard, notifications

**Standard error codes**: `400` validation, `401` no session, `403` wrong role, `404` not found, `409` conflict (double-allocation / overlap), `500` server error.

---

## 5. UI/UX — screen by screen (what to actually build)

Below is what each screen needs, ordered by build priority (matches the role-split from the roadmap: Track A = Identity/Org, Track B = Assets/Allocation, Track C = Booking/Ops).

**Login/Signup** — email+password, signup has no role field at all (silently defaults to Employee server-side). Simple, don't over-design.

**Dashboard** — KPI card row (Available / Allocated / Maintenance Today / Active Bookings / Pending Transfers / Upcoming Returns), an "overdue" section visually separated (red/amber accent) from upcoming ones, three quick-action buttons.

**Organization Setup (Admin, 3 tabs)** — Departments table with inline edit + parent-department dropdown; Categories table; Employee Directory table with a "Promote" action that opens a small role-select modal (this is the *only* place role changes happen — reinforce that in the UI copy, e.g. a note under the table).

**Asset Directory** — searchable/filterable table (tag, category, status, location), status shown as a colored badge, click-through to per-asset detail with two tabs: Allocation history / Maintenance history.

**Allocation screen** — pick asset (only shows Available ones by default) → pick employee/department → optional expected return date → Allocate. On conflict: a modal, not a toast — "Currently held by Priya Sharma, allocated 3 days ago" + a "Request Transfer" button.

**Booking screen** — calendar/week view per resource, click a slot to book, live overlap check before submit (disable submit button + inline message if it would conflict), status pills (Upcoming/Ongoing/Completed/Cancelled).

**Maintenance screen** — simple Kanban-style columns (Pending / Approved / In Progress / Resolved) is faster to build than a form-heavy flow and demos well.

**Notifications** — a simple reverse-chronological list, icon per event type, unread indicator.

Mockup below shows the dashboard as a concrete visual reference for spacing/density — treat it as a style anchor, not a pixel spec.

---

## 6. 6-hour execution plan (condensed)

| Time | Focus |
|---|---|
| 0:00–0:30 | Schema finalized (already done via `prisma_schema.prisma`), pushed to DB, seeded |
| 0:30–1:00 | Track split: A=Identity/Org, B=Assets/Allocation, C=Booking/Maintenance/Dashboard |
| 1:00–3:30 | Core build sprint, one 20-min sync at the midpoint to catch schema drift between tracks |
| 3:30–4:15 | Integration — test the two conflict rules end-to-end, live |
| 4:15–5:15 | Dashboard wiring, notifications, UI polish pass |
| 5:15–5:45 | Demo script rehearsal with seeded conflict data |
| 5:45–6:00 | Buffer |

**Non-negotiable before demo**: allocate-conflict block works, booking-overlap block works, all 4 roles can log in, KPIs pull real numbers. Everything else is bonus.

---

## 7. Source documents this consolidates
`AssetFlow_problem_statement.pdf` (spec) · `prisma_schema.prisma` (data model) · `API_Route_Structure_Guide.md` (endpoints) · `Database_Implementation_Guide.md` (queries/constraints) · `AssetFlow_Deep_Research_Analysis.md` (scope analysis) · `Project_Summary_and_Roadmap.md` (8-hr plan) · `Quick_Reference_Card.md` (cheat sheet) · this conversation's 6-hour cut-down and DB-role discussion.
