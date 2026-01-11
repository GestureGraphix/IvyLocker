import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]

    const result = await sql`
      SELECT id, date, mental_state, physical_state, notes, created_at
      FROM check_in_logs
      WHERE user_id = ${user.id}
        AND date = ${today}
    `

    if (result.length === 0) {
      return NextResponse.json({ checkIn: null })
    }

    return NextResponse.json({ checkIn: result[0] })
  } catch (error) {
    console.error("Get today's check-in error:", error)
    return NextResponse.json({ error: "Failed to get check-in" }, { status: 500 })
  }
}
