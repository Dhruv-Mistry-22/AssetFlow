import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Running AssetFlow Constraint Tests...\n");

  // Get AF-0001 (already allocated to Priya)
  const asset1 = await prisma.asset.findUnique({ where: { assetTag: 'AF-0001' } });
  const raj = await prisma.user.findFirst({ where: { email: 'raj@assetflow.com' } });

  console.log("Test 1: Try allocating AF-0001 (already held by Priya) to Raj");
  if (!asset1 || !raj) {
    console.log("Skipping Test 1 (Missing test data)");
  } else {
    try {
      await prisma.allocation.create({
        data: {
          assetId: asset1.id,
          employeeId: raj.id,
          status: 'ACTIVE',
        }
      });
      console.log("❌ Test 1 Failed: The database allowed the double allocation!");
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log("✅ Test 1 Passed: The database safely blocked the double allocation (Prisma Unique constraint P2002 caught).");
      } else {
        console.log("❓ Test 1 Error: ", error.message);
      }
    }
  }

  // Get Atlas Room
  const atlasRoom = await prisma.asset.findFirst({ where: { name: 'Atlas Conference Room' } });
  
  if (!atlasRoom) {
    console.log("Skipping Tests 2 & 3 (Missing test data)");
    process.exit(0);
  }

  // Tomorrow at 9:00 AM (base time from seed)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  console.log("\nTest 2: Try booking Atlas Room for 9:00-10:00 tomorrow (Exact Overlap)");
  // Simulate the API overlap check logic
  const newStart = new Date(tomorrow);
  newStart.setHours(9, 0, 0, 0);
  const newEnd = new Date(tomorrow);
  newEnd.setHours(10, 0, 0, 0);

  const conflict1 = await prisma.booking.findFirst({
    where: {
      assetId: atlasRoom.id,
      status: { in: ['UPCOMING', 'ONGOING'] },
      startTime: { lt: newEnd },
      endTime: { gt: newStart }
    }
  });

  if (conflict1) {
    console.log("✅ Test 2 Passed: Overlap query correctly caught the conflict and blocked it.");
  } else {
    console.log("❌ Test 2 Failed: Overlap query missed the conflict.");
  }

  console.log("\nTest 3: Try booking Atlas Room for 10:00-11:00 tomorrow (Adjacent)");
  const adjStart = new Date(tomorrow);
  adjStart.setHours(10, 0, 0, 0);
  const adjEnd = new Date(tomorrow);
  adjEnd.setHours(11, 0, 0, 0);

  const conflict2 = await prisma.booking.findFirst({
    where: {
      assetId: atlasRoom.id,
      status: { in: ['UPCOMING', 'ONGOING'] },
      startTime: { lt: adjEnd },
      endTime: { gt: adjStart }
    }
  });

  if (!conflict2) {
    console.log("✅ Test 3 Passed: Overlap query correctly allowed the adjacent booking (no conflict).");
  } else {
    console.log("❌ Test 3 Failed: Overlap query incorrectly blocked the adjacent booking.");
  }

  console.log("\n🧪 Tests Complete.");
  process.exit(0);
}

runTests();
