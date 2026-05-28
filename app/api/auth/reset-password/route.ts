import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserByResetToken, hashPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const user = await getUserByResetToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 })
    }

    if (new Date(user.password_reset_expires) < new Date()) {
      return NextResponse.json({ error: "Reset link has expired. Please request a new one.", code: "TOKEN_EXPIRED" }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL,
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ message: "Password reset successfully. You can now sign in." })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
