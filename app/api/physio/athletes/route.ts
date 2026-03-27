import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/physio/athletes — list athletes linked to this physio
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const athletes = await sql`
      SELECT
        u.id, u.email, u.name,
        ap.sport, ap.team, ap.university,
        pa.created_at as linked_at,
        (
          SELECT COUNT(*)::int
          FROM physio_assignments pax
          WHERE pax.athlete_id = u.id AND pax.physio_id = ${user.id} AND pax.status = 'active'
        ) as active_assignments
      FROM physio_athletes pa
      JOIN users u ON pa.athlete_id = u.id
      LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
      WHERE pa.physio_id = ${user.id}
      ORDER BY u.name
    `

    return NextResponse.json({ athletes })
  } catch (error) {
    console.error("Get physio athletes error:", error)
    return NextResponse.json({ error: "Failed to get athletes" }, { status: 500 })
  }
}

// POST /api/physio/athletes — link an athlete by email
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Athlete email is required" }, { status: 400 })

    const athleteResult = await sql`
      SELECT id, email, name, role FROM users WHERE email = ${email}
    `
    if (athleteResult.length === 0) {
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 })
    }

    const athlete = athleteResult[0]
    if (athlete.role !== "ATHLETE") {
      return NextResponse.json({ error: "That user is not an athlete" }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM physio_athletes WHERE physio_id = ${user.id} AND athlete_id = ${athlete.id}
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: "Athlete already linked" }, { status: 400 })
    }

    await sql`INSERT INTO physio_athletes (physio_id, athlete_id) VALUES (${user.id}, ${athlete.id})`

    return NextResponse.json({ success: true, athlete: { id: athlete.id, name: athlete.name, email: athlete.email } })
  } catch (error) {
    console.error("Link physio athlete error:", error)
    return NextResponse.json({ error: "Failed to link athlete" }, { status: 500 })
  }
}

// DELETE /api/physio/athletes?athleteId=... — unlink an athlete
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")
    if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 })

    await sql`DELETE FROM physio_athletes WHERE physio_id = ${user.id} AND athlete_id = ${athleteId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unlink physio athlete error:", error)
    return NextResponse.json({ error: "Failed to unlink athlete" }, { status: 500 })
  }
}
