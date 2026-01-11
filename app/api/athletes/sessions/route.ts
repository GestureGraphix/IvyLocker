import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ sessions: [] })
    }

    const sessions = await sql`
      SELECT * FROM sessions 
      WHERE user_id = ${user.id}
      ORDER BY start_at DESC
    `

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error("Get sessions error:", error)
    return NextResponse.json({ error: "Failed to get sessions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, type, start_at, end_at, intensity, focus, notes } = await request.json()

    const result = await sql`
      INSERT INTO sessions (user_id, title, type, start_at, end_at, intensity, focus, notes)
      VALUES (${user.id}, ${title}, ${type}, ${start_at}, ${end_at}, ${intensity}, ${focus || null}, ${notes || null})
      RETURNING *
    `

    return NextResponse.json({ session: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create session error:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
