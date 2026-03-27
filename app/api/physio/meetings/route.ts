import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")
    const month = searchParams.get("month") // "YYYY-MM"

    let monthStart: Date | null = null
    let monthEnd: Date | null = null
    if (month) {
      const [y, m] = month.split("-").map(Number)
      monthStart = new Date(y, m - 1, 1)
      monthEnd = new Date(y, m, 1)
    }

    const meetings = await sql`
      SELECT pm.*, u.name AS athlete_name
      FROM physio_meetings pm
      JOIN users u ON pm.athlete_id = u.id
      WHERE pm.physio_id = ${user.id}
        ${athleteId ? sql`AND pm.athlete_id = ${athleteId}` : sql``}
        ${monthStart ? sql`AND pm.scheduled_at >= ${monthStart.toISOString()} AND pm.scheduled_at < ${monthEnd!.toISOString()}` : sql``}
      ORDER BY pm.scheduled_at ASC
    `

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error("Get physio meetings error:", error)
    return NextResponse.json({ error: "Failed to get meetings" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { athleteId, title, notes, scheduledAt, durationMinutes } = await request.json()

    if (!athleteId || !scheduledAt) {
      return NextResponse.json({ error: "athleteId and scheduledAt are required" }, { status: 400 })
    }

    const linked = await sql`
      SELECT id FROM physio_athletes WHERE physio_id = ${user.id} AND athlete_id = ${athleteId}
    `
    if (linked.length === 0) {
      return NextResponse.json({ error: "Athlete is not linked to you" }, { status: 403 })
    }

    const result = await sql`
      INSERT INTO physio_meetings (physio_id, athlete_id, title, notes, scheduled_at, duration_minutes)
      VALUES (
        ${user.id}, ${athleteId},
        ${title || "Meeting"},
        ${notes || null},
        ${scheduledAt},
        ${durationMinutes || 60}
      )
      RETURNING *
    `

    return NextResponse.json({ meeting: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create physio meeting error:", error)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}
