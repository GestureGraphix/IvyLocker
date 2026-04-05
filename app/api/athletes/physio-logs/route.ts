import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/physio-logs - Get athlete's plan logs
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')

    const logs = await sql`
      SELECT
        pl.id, pl.assignment_id, pl.logged_date, pl.notes, pl.pain_level, pl.created_at,
        pa.title as plan_title, pa.type as plan_type
      FROM physio_plan_logs pl
      JOIN physio_assignments pa ON pa.id = pl.assignment_id
      WHERE pl.athlete_id = ${user.id}
        ${assignmentId ? sql`AND pl.assignment_id = ${assignmentId}` : sql``}
      ORDER BY pl.logged_date DESC, pl.created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Get physio logs error:', error)
    return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 })
  }
}

// POST /api/athletes/physio-logs - Log a session for a plan
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { assignmentId, notes, pain_level } = await request.json()

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 })
    }

    // Verify assignment belongs to this athlete
    const assignment = await sql`
      SELECT id FROM physio_assignments
      WHERE id = ${assignmentId} AND athlete_id = ${user.id} AND status = 'active'
    `
    if (assignment.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const result = await sql`
      INSERT INTO physio_plan_logs (assignment_id, athlete_id, notes, pain_level)
      VALUES (${assignmentId}, ${user.id}, ${notes || null}, ${pain_level ?? null})
      RETURNING *
    `

    return NextResponse.json({ log: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Create physio log error:', error)
    return NextResponse.json({ error: 'Failed to log session' }, { status: 500 })
  }
}
