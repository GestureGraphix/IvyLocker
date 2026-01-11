import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// POST /api/coach/workouts - Assign a workout to athlete(s)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "COACH") {
      return NextResponse.json({ error: "Not authorized - coaches only" }, { status: 403 })
    }

    const body = await request.json()
    const { athleteIds, title, type, startAt, endAt, intensity, focus, notes } = body

    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json({ error: "At least one athlete is required" }, { status: 400 })
    }

    if (!title || !type || !startAt) {
      return NextResponse.json({ error: "Title, type, and start time are required" }, { status: 400 })
    }

    // Verify all athletes are linked to this coach
    const linkedCheck = await sql`
      SELECT athlete_id FROM coach_athletes
      WHERE coach_id = ${user.id} AND athlete_id = ANY(${athleteIds})
    `

    const linkedIds = linkedCheck.map((r: { athlete_id: string }) => r.athlete_id)
    const unlinkedIds = athleteIds.filter((id: string) => !linkedIds.includes(id))

    if (unlinkedIds.length > 0) {
      return NextResponse.json(
        { error: "Some athletes are not in your roster" },
        { status: 400 }
      )
    }

    // Create session for each athlete
    const createdSessions = []
    for (const athleteId of athleteIds) {
      const result = await sql`
        INSERT INTO sessions (
          user_id, assigned_by, title, type, start_at, end_at,
          intensity, focus, notes, completed
        )
        VALUES (
          ${athleteId}, ${user.id}, ${title}, ${type}, ${startAt},
          ${endAt || null}, ${intensity || 'medium'}, ${focus || null},
          ${notes || null}, false
        )
        RETURNING *
      `
      createdSessions.push(result[0])
    }

    return NextResponse.json({
      success: true,
      sessions: createdSessions,
      count: createdSessions.length,
    })
  } catch (error) {
    console.error("Assign workout error:", error)
    return NextResponse.json({ error: "Failed to assign workout" }, { status: 500 })
  }
}

// GET /api/coach/workouts - Get all workouts assigned by this coach
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "COACH") {
      return NextResponse.json({ error: "Not authorized - coaches only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    let workouts
    if (athleteId) {
      // Get workouts for specific athlete
      workouts = await sql`
        SELECT
          s.*,
          u.name as athlete_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.assigned_by = ${user.id} AND s.user_id = ${athleteId}
        ORDER BY s.start_at DESC
        LIMIT 50
      `
    } else {
      // Get all assigned workouts
      workouts = await sql`
        SELECT
          s.*,
          u.name as athlete_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.assigned_by = ${user.id}
        ORDER BY s.start_at DESC
        LIMIT 100
      `
    }

    return NextResponse.json({ workouts })
  } catch (error) {
    console.error("Get assigned workouts error:", error)
    return NextResponse.json({ error: "Failed to get workouts" }, { status: 500 })
  }
}
