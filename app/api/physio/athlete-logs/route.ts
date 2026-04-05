import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/physio/athlete-logs?athleteId=... - Get an athlete's plan logs
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const assignmentId = searchParams.get('assignmentId')

    const logs = await sql`
      SELECT
        pl.id, pl.assignment_id, pl.logged_date, pl.notes, pl.pain_level, pl.created_at,
        pa.title as plan_title, pa.type as plan_type,
        u.name as athlete_name
      FROM physio_plan_logs pl
      JOIN physio_assignments pa ON pa.id = pl.assignment_id
      JOIN users u ON u.id = pl.athlete_id
      WHERE pa.physio_id = ${user.id}
        ${athleteId ? sql`AND pl.athlete_id = ${athleteId}` : sql``}
        ${assignmentId ? sql`AND pl.assignment_id = ${assignmentId}` : sql``}
      ORDER BY pl.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Get athlete logs error:', error)
    return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 })
  }
}
