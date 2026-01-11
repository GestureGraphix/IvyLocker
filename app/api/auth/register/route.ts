import { NextResponse } from "next/server"
import { createUser, getUserByEmail, createToken, setAuthCookie } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, name, password, role } = await request.json()

    // Validation
    if (!email || !name || !password) {
      return NextResponse.json({ error: "Email, name, and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 })
    }

    // Create user
    const user = await createUser(email, name, password, role || "ATHLETE")

    // Create token and set cookie
    const token = await createToken(user)
    await setAuthCookie(token)

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)

    // Provide more specific error messages
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
