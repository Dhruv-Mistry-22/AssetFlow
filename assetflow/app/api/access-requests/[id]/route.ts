import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    // Only admins can approve/reject requests
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json(); // "APPROVE" or "REJECT"

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const accessRequest = await db.accessRequest.findUnique({
      where: { id: params.id },
    });

    if (!accessRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (accessRequest.status !== "PENDING") {
      return NextResponse.json({ error: "Request is already processed" }, { status: 400 });
    }

    if (action === "REJECT") {
      await db.accessRequest.update({
        where: { id: params.id },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ message: "Request rejected" });
    }

    // APPROVAL FLOW
    // 1. Create the user
    const newUser = await db.user.create({
      data: {
        name: accessRequest.name,
        email: accessRequest.email,
        passwordHash: accessRequest.passwordHash,
        department: accessRequest.department,
        role: "EMPLOYEE", // Base role upon approval
        status: "ACTIVE",
      },
    });

    // 2. Mark request as APPROVED
    await db.accessRequest.update({
      where: { id: params.id },
      data: { status: "APPROVED" },
    });

    // 3. Log activity
    await db.activityLog.create({
      data: {
        userId: session.user.id,
        action: "ACCESS_REQUEST_APPROVED",
        resourceType: "User",
        resourceId: newUser.id,
        details: JSON.stringify({ email: accessRequest.email }),
      },
    });

    return NextResponse.json({ message: "Request approved and user created" });
  } catch (error) {
    console.error("Process Request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
