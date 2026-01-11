import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    // Return default exercises plus any custom ones
    const exercises = await sql`
      SELECT * FROM mobility_exercises 
      WHERE is_custom = false OR created_by = ${user?.id || null}
      ORDER BY body_group, name
    `

    return NextResponse.json({ exercises })
  } catch (error) {
    console.error("Get exercises error:", error)
    return NextResponse.json({ error: "Failed to get exercises" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, body_group, youtube_url, sets, reps, duration_seconds } = await request.json()

    const result = await sql`
      INSERT INTO mobility_exercises (name, body_group, youtube_url, sets, reps, duration_seconds, created_by, is_custom)
      VALUES (${name}, ${body_group}, ${youtube_url || null}, ${sets || null}, ${reps || null}, ${duration_seconds || null}, ${user.id}, true)
      RETURNING *
    `

    return NextResponse.json({ exercise: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create exercise error:", error)
    return NextResponse.json({ error: "Failed to create exercise" }, { status: 500 })
  }
}
