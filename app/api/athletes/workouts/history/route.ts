import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/workouts/history - Get completed workouts for the logged-in athlete
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('days') || '30')

    // Calculate date range (past N days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Fetch completed workouts with session and exercise details
    const workouts = await sql`
      SELECT
        aw.id,
        aw.workout_date,
        aw.completed,
        aw.completed_at,
        aw.notes as athlete_notes,
        aw.perceived_effort,
        ps.id as session_id,
        ps.session_type,
        ps.title as session_title,
        ps.start_time,
        ps.end_time,
        ps.location,
        ps.is_optional,
        wp.name as plan_name,
        u.name as coach_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', pe.id,
              'name', pe.name,
              'details', pe.details,
              'sort_order', pe.sort_order
            ) ORDER BY pe.sort_order
          )
          FROM plan_exercises pe
          WHERE pe.plan_session_id = ps.id
        ) as exercises
      FROM assigned_workouts aw
      JOIN plan_sessions ps ON ps.id = aw.plan_session_id
      JOIN plan_days pd ON pd.id = ps.plan_day_id
      JOIN weekly_plans wp ON wp.id = pd.weekly_plan_id
      JOIN users u ON u.id = wp.coach_id
      WHERE aw.athlete_id = ${user.id}
        AND aw.completed = true
        AND aw.workout_date >= ${startDateStr}
        AND aw.workout_date <= ${endDateStr}
      ORDER BY aw.workout_date DESC, aw.completed_at DESC
    `

    return NextResponse.json({ workouts })
  } catch (error) {
    console.error('Get workout history error:', error)
    return NextResponse.json({ error: 'Failed to get workout history' }, { status: 500 })
  }
}
