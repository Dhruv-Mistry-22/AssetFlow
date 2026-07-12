import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Clearing old data...");
  await prisma.maintenanceRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  console.log("🌱 Seeding AssetFlow database with Enhanced Data...");

  // 1. DEPARTMENTS
  const engineering = await prisma.department.create({ data: { name: "Engineering", description: "Engineering Dept", status: "ACTIVE" } });
  const facilities = await prisma.department.create({ data: { name: "Facilities", description: "Facilities Dept", status: "ACTIVE" } });
  const fieldOps = await prisma.department.create({ data: { name: "Field Ops", description: "Field Ops Dept", status: "ACTIVE" } });
  const fieldOpsEast = await prisma.department.create({ data: { name: "Field ops (east)", description: "East Div", status: "INACTIVE", parentDepartmentId: fieldOps.id } });
  const it = await prisma.department.create({ data: { name: "IT", description: "IT Dept", status: "ACTIVE" } });
  const hr = await prisma.department.create({ data: { name: "HR", description: "HR Dept", status: "ACTIVE" } });

  // 2. USERS
  const hash = await bcrypt.hash("Admin123!", 10);
  const admin = await prisma.user.create({ data: { name: "Aditi Rao", email: "admin@assetflow.com", passwordHash: hash, role: "ADMIN", department: engineering.name } });
  await prisma.department.update({ where: { id: engineering.id }, data: { headOfDepartmentId: admin.id } });

  const rohan = await prisma.user.create({ data: { name: "Rohan Mehta", email: "rohan@assetflow.com", passwordHash: hash, role: "DEPARTMENT_HEAD", department: facilities.name } });
  await prisma.department.update({ where: { id: facilities.id }, data: { headOfDepartmentId: rohan.id } });

  const sana = await prisma.user.create({ data: { name: "Sana Iqbal", email: "sana@assetflow.com", passwordHash: hash, role: "DEPARTMENT_HEAD", department: fieldOpsEast.name } });
  await prisma.department.update({ where: { id: fieldOpsEast.id }, data: { headOfDepartmentId: sana.id } });

  const priya = await prisma.user.create({ data: { name: "Priya Shah", email: "priya@assetflow.com", passwordHash: hash, role: "EMPLOYEE", department: it.name } });
  const john = await prisma.user.create({ data: { name: "John Doe", email: "john@assetflow.com", passwordHash: hash, role: "EMPLOYEE", department: hr.name } });

  // 3. CATEGORIES
  const electronics = await prisma.assetCategory.create({ data: { name: "Electronics", customFields: JSON.stringify([{ name: "Warranty Period (Months)", type: "number", required: true }]) } });
  const furniture = await prisma.assetCategory.create({ data: { name: "Furniture", customFields: JSON.stringify([{ name: "Material", type: "text", required: false }]) } });
  const vehicles = await prisma.assetCategory.create({ data: { name: "Vehicles", customFields: JSON.stringify([{ name: "License Plate", type: "text", required: true }, { name: "Fuel Type", type: "text", required: true }]) } });

  // 4. ASSETS
  const assetsToCreate = [
    { assetTag: "AF-0114", serialNumber: "SN-0114", name: "Laptop AF-0114", categoryId: electronics.id, status: "ALLOCATED", condition: "GOOD", location: "Desk E12", acquisitionCost: 1200, acquisitionDate: new Date("2024-01-01") },
    { assetTag: "AF-0062", serialNumber: "SN-0062", name: "Projector AF-0062", categoryId: electronics.id, status: "UNDER_MAINTENANCE", condition: "POOR", location: "HQ Floor 2", acquisitionCost: 500, acquisitionDate: new Date("2023-05-10") },
    { assetTag: "ROOM-B2", serialNumber: "SN-ROOM-B2", name: "Conference Room B2", categoryId: furniture.id, status: "AVAILABLE", condition: "GOOD", location: "Floor 1", acquisitionCost: 0, acquisitionDate: new Date("2020-01-01") },
    { assetTag: "AF-0115", serialNumber: "SN-0115", name: "Laptop AF-0115", categoryId: electronics.id, status: "AVAILABLE", condition: "EXCELLENT", location: "Storage IT", acquisitionCost: 1300, acquisitionDate: new Date("2024-02-15") },
    { assetTag: "AF-0116", serialNumber: "SN-0116", name: "Laptop AF-0116", categoryId: electronics.id, status: "ALLOCATED", condition: "FAIR", location: "Desk H4", acquisitionCost: 1100, acquisitionDate: new Date("2022-11-20") },
    { assetTag: "AF-0078", serialNumber: "SN-0078", name: "Forklift AF-0078", categoryId: vehicles.id, status: "UNDER_MAINTENANCE", condition: "DAMAGED", location: "Warehouse A", acquisitionCost: 15000, acquisitionDate: new Date("2021-08-10") },
    { assetTag: "AF-0003", serialNumber: "SN-0003", name: "AC Unit AF-0003", categoryId: electronics.id, status: "AVAILABLE", condition: "GOOD", location: "Server Room", acquisitionCost: 3500, acquisitionDate: new Date("2023-01-05") },
    { assetTag: "AF-0897", serialNumber: "SN-0897", name: "Printer Jam AF-0897", categoryId: electronics.id, status: "UNDER_MAINTENANCE", condition: "POOR", location: "HR Floor", acquisitionCost: 800, acquisitionDate: new Date("2022-03-12") },
    { assetTag: "AF-0873", serialNumber: "SN-0873", name: "Office Chair AF-0873", categoryId: furniture.id, status: "AVAILABLE", condition: "GOOD", location: "Desk E14", acquisitionCost: 200, acquisitionDate: new Date("2023-11-01") },
    { assetTag: "AF-0120", serialNumber: "SN-0120", name: "Desktop Workstation", categoryId: electronics.id, status: "ALLOCATED", condition: "EXCELLENT", location: "Desk H2", acquisitionCost: 2500, acquisitionDate: new Date("2024-05-10") },
    { assetTag: "AF-0130", serialNumber: "SN-0130", name: "Company Car - Sedan", categoryId: vehicles.id, status: "ALLOCATED", condition: "GOOD", location: "Parking Bay 4", acquisitionCost: 28000, acquisitionDate: new Date("2022-01-20") },
  ];

  const createdAssets: any = {};
  for (const a of assetsToCreate) {
    createdAssets[a.assetTag] = await prisma.asset.create({ data: a as any });
  }

  // 5. ALLOCATIONS
  await prisma.allocation.create({ data: { assetId: createdAssets["AF-0114"].id, employeeId: priya.id, department: it.name, status: "ACTIVE" } });
  await prisma.allocation.create({ data: { assetId: createdAssets["AF-0116"].id, employeeId: john.id, department: hr.name, status: "ACTIVE" } });
  await prisma.allocation.create({ data: { assetId: createdAssets["AF-0120"].id, employeeId: admin.id, department: engineering.name, status: "ACTIVE" } });
  await prisma.allocation.create({ data: { assetId: createdAssets["AF-0130"].id, employeeId: rohan.id, department: facilities.name, status: "ACTIVE" } });

  // 6. MAINTENANCE REQUESTS (Costs & History)
  await prisma.maintenanceRequest.create({
    data: {
      assetId: createdAssets["AF-0062"].id, requestedByUserId: priya.id, description: "Projector bulb not turning on", status: "PENDING", priority: "HIGH"
    }
  });
  await prisma.maintenanceRequest.create({
    data: {
      assetId: createdAssets["AF-0078"].id, requestedByUserId: rohan.id, description: "Forklift hydraulic leak", status: "IN_PROGRESS", priority: "CRITICAL"
    }
  });
  await prisma.maintenanceRequest.create({
    data: {
      assetId: createdAssets["AF-0897"].id, requestedByUserId: john.id, description: "Printer Jam (parts ordered)", status: "IN_PROGRESS", priority: "MEDIUM"
    }
  });
  
  // Completed requests for reports calculations
  await prisma.maintenanceRequest.create({
    data: {
      assetId: createdAssets["AF-0003"].id, requestedByUserId: admin.id, description: "AC unit noisy compressor", status: "COMPLETED", priority: "HIGH", resolutionNotes: "Replaced compressor", completedAt: new Date("2024-05-15")
    }
  });
  await prisma.maintenanceRequest.create({
    data: {
      assetId: createdAssets["AF-0873"].id, requestedByUserId: john.id, description: "Chair wheel broken", status: "COMPLETED", priority: "LOW", resolutionNotes: "Replaced wheel", completedAt: new Date("2024-06-20")
    }
  });
  await prisma.maintenanceRequest.create({
    data: {
      assetId: createdAssets["AF-0114"].id, requestedByUserId: priya.id, description: "Keyboard replacement", status: "COMPLETED", priority: "MEDIUM", resolutionNotes: "Swapped keyboard", completedAt: new Date("2024-06-01")
    }
  });
  
  // 7. BOOKINGS
  await prisma.booking.create({
    data: {
      assetId: createdAssets["ROOM-B2"].id, employeeId: admin.id, startTime: new Date(new Date().setHours(14, 0, 0, 0)), endTime: new Date(new Date().setHours(15, 0, 0, 0)), status: "UPCOMING", purpose: "Team Sync"
    }
  });

  console.log("✅ Database seeded with rich historical dummy data!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
