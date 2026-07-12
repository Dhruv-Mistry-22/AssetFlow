import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { accessRequestSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = accessRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { name, email, password, department, reason } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if a pending request already exists
    const existingRequest = await db.accessRequest.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingRequest && existingRequest.status === "PENDING") {
      return NextResponse.json(
        { error: "You already have a pending access request." },
        { status: 409 }
      );
    }

    // Hash the desired password securely for storage
    const passwordHash = await bcrypt.hash(password, 12);

    // If there is an existing rejected request, update it, otherwise create new
    if (existingRequest) {
      await db.accessRequest.update({
        where: { email: normalizedEmail },
        data: {
          name,
          passwordHash,
          department,
          reason,
          status: "PENDING",
        }
      });
    } else {
      await db.accessRequest.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          department,
          reason,
          status: "PENDING",
        }
      });
    }

    return NextResponse.json(
      { message: "Access request submitted successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Access Request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
