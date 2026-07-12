# 🌟 AssetFlow | Enterprise Asset & Resource Management

> **Branch:** `Backend-core` | **Tech Stack:** Next.js 14, React, Tailwind CSS, Prisma, PostgreSQL, NextAuth.js v5, Upstash Redis

AssetFlow is a modern, full-stack Enterprise Asset Management (EAM) portal built for hackathons and production environments alike. It features a stunning glassmorphic UI, robust server-side authentication, rigorous database-level conflict prevention, and advanced real-time integrations.

![AssetFlow Dashboard](https://img.shields.io/badge/UI-Glassmorphism-blue)
![Database](https://img.shields.io/badge/DB-PostgreSQL-blue)
![Auth](https://img.shields.io/badge/Auth-NextAuth_v5-green)
![Redis](https://img.shields.io/badge/Redis-Upstash-red)

---

## ✨ Key Features

### 1. Robust Core Architecture
- **Next.js App Router**: Server components for blazing-fast initial loads and secure server-side data fetching.
- **PostgreSQL + Prisma**: Strongly typed database interactions with a 15+ table schema handling Users, Assets, Allocations, Bookings, Maintenance, and Audits.
- **NextAuth v5 (Auth.js)**: Secure session management with Role-Based Access Control (RBAC).

### 2. Bulletproof Constraints
- **Zero Double-Allocations**: Enforced at the database level using `UNIQUE INDEX on Allocation(assetId) WHERE status = 'ACTIVE'`.
- **Intelligent Booking Overlap**: Mathematical half-open interval logic (`startTime < newEnd && endTime > newStart`) strictly prevents conflicting room/resource reservations while allowing perfectly adjacent bookings.

### 3. Advanced Integrations
- **Slack Webhooks**: Real-time alerts for critical system events.
- **Upstash Redis Rate Limiting**: A sliding-window rate limiter guarantees Slack alerts never exceed 5 per minute, preventing notification spam.
- **Data Sync API**: Instantly dump your PostgreSQL state to JSON via the `/api/sync` route for backups or third-party integrations.

### 4. Public Landing & Access Workflow
- **Public Portal**: Unauthenticated users are greeted by a beautiful landing page highlighting system capabilities.
- **Request Access Flow**: External users can submit an access request. Admins receive this in their `Access Requests` dashboard and can grant one-click approval, automatically provisioning the new account.

### 5. Dynamic Role-Based Access Control (RBAC)
The system securely adapts to the user's role (`ADMIN`, `ASSET_MANAGER`, `DEPARTMENT_HEAD`, `EMPLOYEE`):
- Sidebar navigation dynamically filters restricted routes (e.g., standard employees cannot see Audits or Access Requests).
- The user's role is proudly displayed in the top-right header dropdown.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+
- PostgreSQL Database (Neon or Supabase free tier recommended)
- (Optional) Upstash Redis URL/Token for Webhook rate limiting

### 2. Clone & Install
```bash
git clone https://github.com/Dhruv-Mistry-22/AssetFlow.git
cd AssetFlow/assetflow
git checkout Backend-core
npm install
```

### 3. Environment Configuration
Copy the template and fill in your details:
```bash
cp .env.local.example .env.local
```
Inside `.env.local`:
```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
AUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# Optional integrations
UPSTASH_REDIS_REST_URL="your-upstash-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
SLACK_WEBHOOK_URL="your-slack-webhook"
```

### 4. Database Setup & Run
```bash
npx prisma db push        # Push the schema to your Postgres instance
npx prisma db seed        # Seed the DB with demo data
npx ts-node test-scenarios.ts # Run local DB constraint tests!
npm run dev               # Start the Next.js dev server
```

---

## 🔐 Demo Credentials

The `seed.ts` script provisions the following accounts for immediate testing:

| Role           | Email                     | Password       | Access Level |
|----------------|---------------------------|----------------|--------------|
| Admin          | `admin@assetflow.com`     | `Admin123!`    | Full access, Approvals |
| Asset Manager  | `manager@assetflow.com`   | `Manager123!`  | Operational CRUD, Audits |
| Dept Head      | `head@assetflow.com`      | `Head123!`     | Standard |
| Employee       | `priya@assetflow.com`     | `Employee123!` | Standard |
| Employee       | `raj@assetflow.com`       | `Employee123!` | Standard |

*(Note: During development, you can use the relaxed password validation to create new accounts with simple passwords like `test`)*

---

## 🎬 4-Minute Hackathon Demo Script

Follow this script to wow the judges:

1. **The Public Face**: Open `localhost:3000` in an Incognito window to show off the public Landing Page.
2. **Access Request**: Submit a "Request Access" form (e.g., John Doe wanting to join the IT team).
3. **Admin Login**: Log in as `admin@assetflow.com`. Point out the RBAC header and the **Access Requests** sidebar tab.
4. **One-Click Approval**: Go to Access Requests, approve John Doe, and show how he is now a real user.
5. **The Dashboard**: Navigate to the Dashboard and highlight the real-time KPI aggregations.
6. **Constraint Test 1 (Double Allocation)**: Attempt to allocate laptop `AF-0001` to Raj. It will throw a 409 error because it is already held by Priya.
7. **Constraint Test 2 (Booking Overlap)**: Attempt to book the *Atlas Conference Room* for 9:00-10:00 AM tomorrow. It will fail (overlap). Book it for 10:00-11:00 AM instead (adjacent). It succeeds!
8. **Slack Webhook Test**: Reject a maintenance ticket or trigger a system alert to fire off the Slack webhook (rate-limited by Redis).

---

## 🏗️ Project Structure
```
assetflow/
├── app/                  # Next.js App Router Pages & Layouts
│   ├── (dashboard)/      # Protected Admin/Employee UI routes
│   ├── api/              # Secure REST endpoints
│   ├── auth/             # Custom Login screens
│   └── page.tsx          # Public Landing Page
├── components/           # Reusable React UI Components (Shadcn UI)
├── lib/                  # Utilities (Prisma singleton, Redis client, Zod schemas)
├── prisma/               # Database Models & Seeding
├── middleware.ts         # Route protection logic
└── test-scenarios.ts     # DB constraint validation script
```

---

### Built with ❤️ for the Hackathon
