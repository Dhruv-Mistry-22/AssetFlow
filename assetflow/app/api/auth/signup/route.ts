import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/schemas";

/**
 * POST /api/auth/signup
 * Creates a new EMPLOYEE account (role is always EMPLOYEE on signup)
 * Admin promotes users to higher roles from the Organization panel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { name, email, password, department } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user — always EMPLOYEE, never trust client-supplied role
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "EMPLOYEE",
        department: department?.trim() || null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    // Log signup activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "USER_REGISTERED",
        resourceType: "User",
        resourceId: user.id,
        details: JSON.stringify({ name: user.name, email: user.email }),
      },
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
