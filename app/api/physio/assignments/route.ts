import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/physio/assignments?athleteId=... — list assignments for an athlete (physio view)
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    const assignments = await sql`
      SELECT pa.*, u.name as athlete_name
      FROM physio_assignments pa
      JOIN users u ON pa.athlete_id = u.id
      WHERE pa.physio_id = ${user.id}
        ${athleteId ? sql`AND pa.athlete_id = ${athleteId}` : sql``}
      ORDER BY pa.created_at DESC
    `

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Get physio assignments error:", error)
    return NextResponse.json({ error: "Failed to get assignments" }, { status: 500 })
  }
}

// POST /api/physio/assignments — create a new assignment
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const body = await request.json()
    const { athleteId, title, description, type, exercises, frequency, duration_weeks, notes } = body

    if (!athleteId || !title) {
      return NextResponse.json({ error: "athleteId and title are required" }, { status: 400 })
    }

    // Verify the athlete is linked to this physio
    const linked = await sql`
      SELECT id FROM physio_athletes WHERE physio_id = ${user.id} AND athlete_id = ${athleteId}
    `
    if (linked.length === 0) {
      return NextResponse.json({ error: "Athlete is not linked to you" }, { status: 403 })
    }

    const result = await sql`
      INSERT INTO physio_assignments
        (physio_id, athlete_id, title, description, type, exercises, frequency, duration_weeks, notes)
      VALUES
        (${user.id}, ${athleteId}, ${title}, ${description || null},
         ${type || "prehab"}, ${JSON.stringify(exercises || [])},
         ${frequency || null}, ${duration_weeks || null}, ${notes || null})
      RETURNING *
    `

    return NextResponse.json({ assignment: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create physio assignment error:", error)
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 })
  }
}
