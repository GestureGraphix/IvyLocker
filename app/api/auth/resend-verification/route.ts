import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getUserByEmail, generateToken } from "@/lib/auth"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await getUserByEmail(email)

    // Always return success to prevent email enumeration
    if (!user || user.email_verified) {
      return NextResponse.json({ message: "If that email is registered and unverified, a new link has been sent." })
    }

    const verificationToken = generateToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    await sql`
      UPDATE users
      SET email_verification_token = ${verificationToken},
          email_verification_expires = ${verificationExpires.toISOString()},
          updated_at = NOW()
      WHERE id = ${user.id}
    `

    try {
      await sendVerificationEmail(email, user.name, verificationToken)
    } catch (emailError) {
      console.error("Failed to resend verification email:", emailError)
    }

    return NextResponse.json({ message: "If that email is registered and unverified, a new link has been sent." })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
