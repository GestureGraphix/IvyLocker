import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserByVerificationToken } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 })
    }

    const user = await getUserByVerificationToken(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 })
    }

    if (user.email_verified) {
      return NextResponse.json({ message: "Email already verified. You can sign in." })
    }

    if (new Date(user.email_verification_expires) < new Date()) {
      return NextResponse.json({ error: "Verification link has expired. Please request a new one.", code: "TOKEN_EXPIRED" }, { status: 400 })
    }

    await sql`
      UPDATE users
      SET email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL,
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    return NextResponse.json({ message: "Email verified successfully. You can now sign in." })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 })
  }
}
