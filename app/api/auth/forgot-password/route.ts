import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserByEmail, generateToken } from "@/lib/auth"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Always return success to prevent email enumeration
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." })
    }

    const resetToken = generateToken()
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await sql`
      UPDATE users
      SET password_reset_token = ${resetToken},
          password_reset_expires = ${resetExpires.toISOString()},
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    try {
      await sendPasswordResetEmail(email, user.name, resetToken)
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
    }

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
