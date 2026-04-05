import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/coach/meetings - List coach's meetings
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const meetings = await sql`
      SELECT
        cm.id, cm.title, cm.notes, cm.scheduled_at, cm.duration_minutes,
        cm.meeting_type, cm.status, cm.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email
            )
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) as invitees
      FROM coach_meetings cm
      LEFT JOIN coach_meeting_invitees cmi ON cmi.meeting_id = cm.id
      LEFT JOIN users u ON u.id = cmi.athlete_id
      WHERE cm.coach_id = ${user.id}
      GROUP BY cm.id
      ORDER BY cm.scheduled_at DESC
      LIMIT 50
    `

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error('Get coach meetings error:', error)
    return NextResponse.json({ error: 'Failed to get meetings' }, { status: 500 })
  }
}

// POST /api/coach/meetings - Create a meeting
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'COACH') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, notes, scheduledAt, durationMinutes, meetingType, athleteIds } = await request.json()

    if (!scheduledAt) {
      return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 })
    }

    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json({ error: 'At least one athlete is required' }, { status: 400 })
    }

    // Create meeting
    const result = await sql`
      INSERT INTO coach_meetings (coach_id, title, notes, scheduled_at, duration_minutes, meeting_type)
      VALUES (
        ${user.id},
        ${title || 'Meeting'},
        ${notes || null},
        ${scheduledAt},
        ${durationMinutes || 30},
        ${meetingType || 'individual'}
      )
      RETURNING id
    `
    const meetingId = result[0].id

    // Add invitees
    for (const athleteId of athleteIds) {
      await sql`
        INSERT INTO coach_meeting_invitees (meeting_id, athlete_id)
        VALUES (${meetingId}, ${athleteId})
        ON CONFLICT DO NOTHING
      `
    }

    return NextResponse.json({ meetingId, message: 'Meeting scheduled' }, { status: 201 })
  } catch (error) {
    console.error('Create coach meeting error:', error)
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}
