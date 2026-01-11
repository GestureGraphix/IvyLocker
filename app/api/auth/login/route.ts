import { NextResponse } from "next/server"
import { getUserByEmail, verifyPassword, createToken, setAuthCookie } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Get user
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Create token and set cookie
    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
    await setAuthCookie(token)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (errorMessage.includes("DATABASE_URL")) {
      return NextResponse.json({ error: "Database configuration error. Please contact support." }, { status: 500 })
    }

    if (errorMessage.includes("rate limit")) {
      return NextResponse.json({ error: "Too many requests. Please try again in a moment." }, { status: 429 })
    }

    return NextResponse.json({ error: "Failed to login. Please try again." }, { status: 500 })
  }
}
