import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ logs: [] })
    }

    const logs = await sql`
      SELECT ml.*, me.name as exercise_name, me.body_group
      FROM mobility_logs ml
      LEFT JOIN mobility_exercises me ON ml.exercise_id = me.id
      WHERE ml.user_id = ${user.id}
      ORDER BY ml.date DESC, ml.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Get mobility logs error:", error)
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { exercise_id, date, duration_minutes, notes } = await request.json()

    const result = await sql`
      INSERT INTO mobility_logs (user_id, exercise_id, date, duration_minutes, notes)
      VALUES (${user.id}, ${exercise_id}, ${date}, ${duration_minutes}, ${notes || null})
      RETURNING *
    `

    return NextResponse.json({ log: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create mobility log error:", error)
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 })
  }
}
