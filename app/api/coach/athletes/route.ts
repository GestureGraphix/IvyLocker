import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/coach/athletes - List all athletes for this coach
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
    const search = searchParams.get('search')
    const notInGroup = searchParams.get('notInGroup')

    // Get all athletes linked to this coach with their profile data and groups
    const athletes = await sql`
      SELECT
        u.id, u.email, u.name, u.created_at,
        ap.sport, ap.team, ap.position, ap.university,
        ap.height_cm, ap.weight_kg, ap.tags,
        ca.created_at as linked_at,
        (
          SELECT json_build_object(
            'mental_state', mental_state,
            'physical_state', physical_state,
            'date', date
          )
          FROM check_in_logs
          WHERE user_id = u.id AND date = CURRENT_DATE
          LIMIT 1
        ) as todays_checkin,
        (
          SELECT COUNT(*)::int
          FROM sessions
          WHERE user_id = u.id
            AND start_at >= CURRENT_DATE
            AND start_at < CURRENT_DATE + INTERVAL '7 days'
        ) as upcoming_sessions,
        (
          SELECT COALESCE(json_agg(json_build_object('id', g.id, 'name', g.name, 'color', g.color)), '[]'::json)
          FROM athlete_group_members gm
          JOIN athlete_groups g ON g.id = gm.group_id
          WHERE gm.athlete_id = u.id AND g.coach_id = ${user.id}
        ) as groups
      FROM coach_athletes ca
      JOIN users u ON ca.athlete_id = u.id
      LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
      WHERE ca.coach_id = ${user.id}
        ${search ? sql`AND (u.name ILIKE ${'%' + search + '%'} OR u.email ILIKE ${'%' + search + '%'})` : sql``}
        ${notInGroup ? sql`AND u.id NOT IN (SELECT athlete_id FROM athlete_group_members WHERE group_id = ${notInGroup})` : sql``}
      ORDER BY u.name
    `

    return NextResponse.json({ athletes })
  } catch (error) {
    console.error("Get coach athletes error:", error)
    return NextResponse.json({ error: "Failed to get athletes" }, { status: 500 })
  }
}

// POST /api/coach/athletes - Link an athlete to this coach (by email)
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
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Athlete email is required" }, { status: 400 })
    }

    // Find the athlete by email
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

    // Check if already linked
    const existingLink = await sql`
      SELECT id FROM coach_athletes
      WHERE coach_id = ${user.id} AND athlete_id = ${athlete.id}
    `

    if (existingLink.length > 0) {
      return NextResponse.json({ error: "Athlete is already linked to you" }, { status: 400 })
    }

    // Create the relationship
    await sql`
      INSERT INTO coach_athletes (coach_id, athlete_id)
      VALUES (${user.id}, ${athlete.id})
    `

    return NextResponse.json({
      success: true,
      athlete: { id: athlete.id, name: athlete.name, email: athlete.email }
    })
  } catch (error) {
    console.error("Link athlete error:", error)
    return NextResponse.json({ error: "Failed to link athlete" }, { status: 500 })
  }
}

// DELETE /api/coach/athletes - Remove athlete link
export async function DELETE(request: Request) {
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

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    await sql`
      DELETE FROM coach_athletes
      WHERE coach_id = ${user.id} AND athlete_id = ${athleteId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unlink athlete error:", error)
    return NextResponse.json({ error: "Failed to unlink athlete" }, { status: 500 })
  }
}
