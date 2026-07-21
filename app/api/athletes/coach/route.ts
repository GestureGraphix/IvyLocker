import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/coach - list the coaches this athlete is linked to
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coaches = await sql`
      SELECT u.id, u.name, u.email, ca.created_at as linked_at
      FROM coach_athletes ca
      JOIN users u ON u.id = ca.coach_id
      WHERE ca.athlete_id = ${user.id}
      ORDER BY u.name
    `

    return NextResponse.json({ coaches })
  } catch (error) {
    console.error('Get athlete coaches error:', error)
    return NextResponse.json({ error: 'Failed to get coaches' }, { status: 500 })
  }
}

// POST /api/athletes/coach - link a coach by email (takes effect immediately)
// Mirrors POST /api/coach/athletes, with the roles swapped.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const email = (body.email || '').trim()

    if (!email) {
      return NextResponse.json({ error: 'A coach email is required' }, { status: 400 })
    }
    if (email.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json({ error: "You can't add yourself as a coach" }, { status: 400 })
    }

    // Case-insensitive lookup (mirrors the friends flow) since emails aren't
    // normalized on insert.
    const found = await sql`
      SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(${email})
    `
    const coach = found[0]
    if (!coach) {
      return NextResponse.json({ error: 'No user found with that email' }, { status: 404 })
    }
    if (coach.role !== 'COACH') {
      return NextResponse.json({ error: 'That user is not a coach' }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM coach_athletes
      WHERE coach_id = ${coach.id} AND athlete_id = ${user.id}
    `
    const coachInfo = { id: coach.id, name: coach.name, email: coach.email }
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, alreadyLinked: true, coach: coachInfo })
    }

    await sql`
      INSERT INTO coach_athletes (coach_id, athlete_id)
      VALUES (${coach.id}, ${user.id})
    `

    return NextResponse.json({ ok: true, coach: coachInfo })
  } catch (error) {
    console.error('Add coach error:', error)
    return NextResponse.json({ error: 'Failed to add coach' }, { status: 500 })
  }
}

// DELETE /api/athletes/coach?coachId=... - unlink a coach
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const coachId = searchParams.get('coachId')
    if (!coachId) {
      return NextResponse.json({ error: 'coachId is required' }, { status: 400 })
    }

    await sql`
      DELETE FROM coach_athletes
      WHERE coach_id = ${coachId} AND athlete_id = ${user.id}
    `

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Remove coach error:', error)
    return NextResponse.json({ error: 'Failed to remove coach' }, { status: 500 })
  }
}
