import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AssetFlow database...");

  // ============================================================================
  // DEPARTMENTS
  // ============================================================================
  const itDept = await prisma.department.upsert({
    where: { name: "IT Department" },
    update: {},
    create: {
      name: "IT Department",
      description: "Information Technology",
      status: "ACTIVE",
    },
  });

  const hrDept = await prisma.department.upsert({
    where: { name: "HR Department" },
    update: {},
    create: {
      name: "HR Department",
      description: "Human Resources",
      status: "ACTIVE",
    },
  });

  const financeDept = await prisma.department.upsert({
    where: { name: "Finance" },
    update: {},
    create: {
      name: "Finance",
      description: "Finance and Accounting",
      parentDepartmentId: null,
      status: "ACTIVE",
    },
  });

  console.log("✅ Departments created");

  // ============================================================================
  // USERS (all 4 roles for demo)
  // ============================================================================
  const admin = await prisma.user.upsert({
    where: { email: "admin@assetflow.com" },
    update: {},
    create: {
      email: "admin@assetflow.com",
      name: "Admin User",
      passwordHash: await bcrypt.hash("Admin123!", 10),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const assetManager = await prisma.user.upsert({
    where: { email: "manager@assetflow.com" },
    update: {},
    create: {
      email: "manager@assetflow.com",
      name: "Arjun Mehta",
      passwordHash: await bcrypt.hash("Manager123!", 10),
      role: "ASSET_MANAGER",
      department: "IT Department",
      status: "ACTIVE",
    },
  });

  const deptHead = await prisma.user.upsert({
    where: { email: "head@assetflow.com" },
    update: {},
    create: {
      email: "head@assetflow.com",
      name: "Neha Sharma",
      passwordHash: await bcrypt.hash("Head123!", 10),
      role: "DEPARTMENT_HEAD",
      department: "IT Department",
      status: "ACTIVE",
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: "priya@assetflow.com" },
    update: {},
    create: {
      email: "priya@assetflow.com",
      name: "Priya Shah",
      passwordHash: await bcrypt.hash("Employee123!", 10),
      role: "EMPLOYEE",
      department: "IT Department",
      status: "ACTIVE",
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: "raj@assetflow.com" },
    update: {},
    create: {
      email: "raj@assetflow.com",
      name: "Raj Kumar",
      passwordHash: await bcrypt.hash("Employee123!", 10),
      role: "EMPLOYEE",
      department: "HR Department",
      status: "ACTIVE",
    },
  });

  console.log("✅ Users created (admin, manager, dept head, 2 employees)");

  // Update department heads
  await prisma.department.update({
    where: { id: itDept.id },
    data: { headOfDepartmentId: deptHead.id },
  });

  // ============================================================================
  // ASSET CATEGORIES
  // ============================================================================
  const laptopCat = await prisma.assetCategory.upsert({
    where: { name: "Laptop" },
    update: {},
    create: {
      name: "Laptop",
      description: "Portable computers and workstations",
    },
  });

  const roomCat = await prisma.assetCategory.upsert({
    where: { name: "Conference Room" },
    update: {},
    create: {
      name: "Conference Room",
      description: "Meeting rooms and collaboration spaces",
    },
  });

  const vehicleCat = await prisma.assetCategory.upsert({
    where: { name: "Vehicle" },
    update: {},
    create: {
      name: "Vehicle",
      description: "Company vehicles for official use",
    },
  });

  const phoneCat = await prisma.assetCategory.upsert({
    where: { name: "Mobile Phone" },
    update: {},
    create: {
      name: "Mobile Phone",
      description: "Company mobile devices",
    },
  });

  console.log("✅ Asset categories created");

  // ============================================================================
  // ASSETS
  // ============================================================================
  const laptop1 = await prisma.asset.upsert({
    where: { assetTag: "AF-0001" },
    update: {},
    create: {
      assetTag: "AF-0001",
      name: "MacBook Pro 16-inch",
      categoryId: laptopCat.id,
      serialNumber: "C02GQ3JQMD6Y",
      status: "ALLOCATED",
      condition: "EXCELLENT",
      location: "Building A, Floor 2, Desk 12",
      acquisitionDate: new Date("2023-01-15"),
      acquisitionCost: 250000,
      warrantyExpiry: new Date("2026-01-15"),
      isBookable: false,
    },
  });

  const laptop2 = await prisma.asset.upsert({
    where: { assetTag: "AF-0002" },
    update: {},
    create: {
      assetTag: "AF-0002",
      name: "Dell XPS 15",
      categoryId: laptopCat.id,
      serialNumber: "D123456789",
      status: "AVAILABLE",
      condition: "GOOD",
      location: "Building A, Floor 2, Store Room",
      acquisitionDate: new Date("2023-06-20"),
      acquisitionCost: 180000,
      isBookable: false,
    },
  });

  const laptop3 = await prisma.asset.upsert({
    where: { assetTag: "AF-0003" },
    update: {},
    create: {
      assetTag: "AF-0003",
      name: "ThinkPad X1 Carbon",
      categoryId: laptopCat.id,
      serialNumber: "T987654321",
      status: "UNDER_MAINTENANCE",
      condition: "FAIR",
      location: "Service Center",
      acquisitionDate: new Date("2022-03-10"),
      acquisitionCost: 150000,
      isBookable: false,
    },
  });

  const confRoom1 = await prisma.asset.upsert({
    where: { assetTag: "AF-0004" },
    update: {},
    create: {
      assetTag: "AF-0004",
      name: "Atlas Conference Room",
      categoryId: roomCat.id,
      serialNumber: "ROOM-A-101",
      status: "AVAILABLE",
      condition: "EXCELLENT",
      location: "Building A, Floor 1, Room 101",
      acquisitionDate: new Date("2020-01-01"),
      acquisitionCost: 500000,
      isBookable: true, // This can be booked!
      description: "Large conference room, 20 seats, projector + whiteboard",
    },
  });

  const confRoom2 = await prisma.asset.upsert({
    where: { assetTag: "AF-0005" },
    update: {},
    create: {
      assetTag: "AF-0005",
      name: "Zeus Meeting Room",
      categoryId: roomCat.id,
      serialNumber: "ROOM-B-201",
      status: "AVAILABLE",
      condition: "GOOD",
      location: "Building B, Floor 2, Room 201",
      acquisitionDate: new Date("2021-06-15"),
      acquisitionCost: 300000,
      isBookable: true,
      description: "Small meeting room, 8 seats, video conferencing setup",
    },
  });

  console.log("✅ Assets created (AF-0001 to AF-0005)");

  // ============================================================================
  // ALLOCATIONS (pre-seeded for demo — shows conflict when trying to allocate AF-0001 again)
  // ============================================================================
  const existingAlloc = await prisma.allocation.findFirst({
    where: { assetId: laptop1.id, status: "ACTIVE" },
  });

  if (!existingAlloc) {
    const allocation = await prisma.allocation.create({
      data: {
        assetId: laptop1.id,
        employeeId: employee1.id,
        department: "IT Department",
        status: "ACTIVE",
        expectedReturnDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days OVERDUE
        notes: "Primary work laptop for Priya Shah",
        allocatedAt: new Date("2025-12-01"),
      },
    });

    await prisma.assetStateHistory.create({
      data: {
        assetId: laptop1.id,
        fromStatus: "AVAILABLE",
        toStatus: "ALLOCATED",
        reason: "Allocated to Priya Shah",
        changedByUserId: assetManager.id,
      },
    });

    console.log("✅ Active allocation created (AF-0001 → Priya Shah, OVERDUE)");
  }

  // ============================================================================
  // BOOKINGS (pre-seeded for demo — shows overlap when trying to book same slot)
  // ============================================================================
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(10, 0, 0, 0);

  const existingBooking = await prisma.booking.findFirst({
    where: { assetId: confRoom1.id, status: "UPCOMING" },
  });

  if (!existingBooking) {
    await prisma.booking.create({
      data: {
        assetId: confRoom1.id,
        employeeId: employee1.id,
        startTime: tomorrow,
        endTime: tomorrowEnd,
        status: "UPCOMING",
        purpose: "Q3 Sprint Planning",
        location: "Building A, Floor 1, Room 101",
      },
    });
    console.log("✅ Booking created (Atlas Room, 9:00-10:00 tomorrow — shows overlap demo)");
  }

  // ============================================================================
  // MAINTENANCE REQUEST (pre-seeded for demo)
  // ============================================================================
  const existingMR = await prisma.maintenanceRequest.findFirst({
    where: { assetId: laptop3.id, status: "APPROVED" },
  });

  if (!existingMR) {
    await prisma.maintenanceRequest.create({
      data: {
        assetId: laptop3.id,
        requestedByUserId: employee2.id,
        priority: "HIGH",
        description: "Screen flickering and battery draining rapidly. Needs hardware inspection.",
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
    console.log("✅ Maintenance request created (AF-0003, APPROVED)");
  }

  // ============================================================================
  // ACTIVITY LOGS (initial seed entries)
  // ============================================================================
  const actCount = await prisma.activityLog.count();
  if (actCount === 0) {
    await prisma.activityLog.createMany({
      data: [
        {
          userId: admin.id,
          action: "USER_REGISTERED",
          resourceType: "User",
          resourceId: admin.id,
          details: JSON.stringify({ name: "Admin User" }),
        },
        {
          userId: assetManager.id,
          action: "ASSET_REGISTERED",
          resourceType: "Asset",
          resourceId: laptop1.id,
          details: JSON.stringify({ assetTag: "AF-0001", name: "MacBook Pro 16-inch" }),
        },
        {
          userId: assetManager.id,
          action: "ASSET_ALLOCATED",
          resourceType: "Asset",
          resourceId: laptop1.id,
          details: JSON.stringify({ assetTag: "AF-0001", allocatedTo: "Priya Shah" }),
        },
      ],
    });
    console.log("✅ Activity logs seeded");
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Demo credentials:");
  console.log("  Admin:        admin@assetflow.com    / Admin123!");
  console.log("  Asset Mgr:    manager@assetflow.com  / Manager123!");
  console.log("  Dept Head:    head@assetflow.com     / Head123!");
  console.log("  Employee:     priya@assetflow.com    / Employee123!");
  console.log("  Employee:     raj@assetflow.com      / Employee123!");
  console.log("\n🔥 Demo scenarios ready:");
  console.log("  - Try allocating AF-0001 → Will fail (held by Priya, OVERDUE!)");
  console.log("  - Book Atlas Room 9:00-10:00 tomorrow → Will fail (overlap)");
  console.log("  - Book Atlas Room 10:00-11:00 tomorrow → Will succeed (adjacent ✅)");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
