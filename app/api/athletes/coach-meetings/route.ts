import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/coach-meetings - Get meetings this athlete is invited to
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const meetings = await sql`
      SELECT
        cm.id, cm.title, cm.notes, cm.scheduled_at, cm.duration_minutes,
        cm.meeting_type, cm.status,
        u.name as coach_name
      FROM coach_meetings cm
      JOIN coach_meeting_invitees cmi ON cmi.meeting_id = cm.id
      JOIN users u ON u.id = cm.coach_id
      WHERE cmi.athlete_id = ${user.id}
        AND cm.status = 'scheduled'
        AND cm.scheduled_at >= NOW() - INTERVAL '1 day'
      ORDER BY cm.scheduled_at ASC
      LIMIT 20
    `

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error('Get athlete coach meetings error:', error)
    return NextResponse.json({ error: 'Failed to get meetings' }, { status: 500 })
  }
}
