import { NextResponse } from "next/server"
import { createUser, getUserByEmail } from "@/lib/auth"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email, name, password, role } = await request.json()

    if (!email || !name || !password) {
      return NextResponse.json({ error: "Email, name, and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    const user = await createUser(email, name, password, role || "ATHLETE")

    // Send verification email (non-blocking — don't fail registration if email fails)
    try {
      await sendVerificationEmail(email, name, user.email_verification_token)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
    }

    return NextResponse.json(
      { message: "Account created. Please check your email to verify your account." },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (errorMessage.includes("DATABASE_URL")) {
      return NextResponse.json({ error: "Database configuration error. Please contact support." }, { status: 500 })
    }
    if (errorMessage.includes("rate limit")) {
      return NextResponse.json({ error: "Too many requests. Please try again in a moment." }, { status: 429 })
    }

    return NextResponse.json({ error: "Failed to register. Please try again." }, { status: 500 })
  }
}
