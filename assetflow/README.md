# AssetFlow — Enterprise Asset & Resource Management

> Branch: `Backend-core` | Stack: Next.js 14 + Prisma + PostgreSQL + NextAuth v5

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database (Neon or Supabase free tier recommended)

### 2. Clone and install
```bash
git clone https://github.com/Dhruv-Mistry-22/AssetFlow.git
cd AssetFlow/assetflow
git checkout Backend-core
npm install
```

### 3. Configure environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your DATABASE_URL and AUTH_SECRET
```

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
AUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Push schema and seed
```bash
npx prisma db push        # Apply schema to your DB
npx prisma db seed        # Seed demo data
npm run dev               # Start development server
```

---

## 🔐 Demo Credentials

| Role           | Email                     | Password       |
|----------------|---------------------------|----------------|
| Admin          | admin@assetflow.com       | Admin123!      |
| Asset Manager  | manager@assetflow.com     | Manager123!    |
| Dept Head      | head@assetflow.com        | Head123!       |
| Employee       | priya@assetflow.com       | Employee123!   |
| Employee       | raj@assetflow.com         | Employee123!   |

---

## 🏗️ Architecture

```
assetflow/
├── app/api/
│   ├── auth/           # NextAuth + signup
│   ├── assets/         # Asset CRUD + history
│   ├── allocations/    # Allocate + return + transfer
│   ├── bookings/       # Resource booking
│   ├── maintenance/    # Maintenance workflow
│   ├── dashboard/      # KPIs + overdue + notifications
│   ├── organization/   # Departments + categories + employees
│   ├── reports/        # CSV exports
│   └── activity-log/   # Event feed
├── lib/
│   ├── db.ts           # Prisma singleton
│   ├── schemas.ts      # Zod validation schemas
│   └── auth-utils.ts   # RBAC + helpers
├── prisma/
│   ├── schema.prisma   # 15+ table schema
│   └── seed.ts         # Demo seed data
├── middleware.ts        # Route protection
└── auth.ts             # NextAuth config
```

---

## 🔒 The Two Critical Constraints

### 1. Double-Allocation Prevention (DB-enforced)
```sql
UNIQUE INDEX on Allocation(assetId) WHERE status = 'ACTIVE'
```
Prisma `P2002` -> API returns `409` with current holder name

### 2. Booking Overlap Prevention (half-open interval)
```typescript
startTime: { lt: endTime },  // existing starts before new ends
endTime:   { gt: startTime } // existing ends after new starts
// Adjacent OK: 10:00 after 9:00-10:00
// Overlap REJECTED: 9:30-10:30 with 9:00-10:00
```

---

## 🎯 All 8 Compulsory Features

| # | Feature | Status |
|---|---------|--------|
| 1 | Auth & Roles | ✅ |
| 2 | Organization Setup | ✅ |
| 3 | Asset Registration & Directory | ✅ |
| 4 | Allocation + Conflict Block | ✅ |
| 5 | Resource Booking + Overlap Block | ✅ |
| 6 | Maintenance Workflow | ✅ |
| 7 | Dashboard KPIs | ✅ |
| 8 | Notifications / Activity Log | ✅ |

---

## 🎬 Demo Script (4 minutes)

```
1. Login as Asset Manager → See real dashboard KPIs
2. AF-0001 is ALLOCATED to Priya Shah (OVERDUE by 3 days)
3. Try allocating AF-0001 to Raj → 409 "held by Priya Shah"
4. Book Atlas Room 9:00-10:00 tomorrow → 409 (pre-seeded conflict)
5. Book Atlas Room 10:00-11:00 tomorrow → 201 (adjacent OK)
6. Login as Admin → Promote Raj to DEPT_HEAD
7. Approve maintenance on AF-0003 → asset UNDER_MAINTENANCE
8. Resolve maintenance → back to AVAILABLE
9. Download CSV report
```

---

## 🚀 Deploy to Vercel

Set env vars: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`
