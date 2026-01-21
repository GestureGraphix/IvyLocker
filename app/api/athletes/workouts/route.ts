import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/workouts - Get assigned workouts for the logged-in athlete
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const weekParam = searchParams.get('week') // 'current' or 'next' or YYYY-MM-DD

    // Calculate date range
    let startDate: string
    let endDate: string

    if (dateParam) {
      // Single day
      startDate = dateParam
      endDate = dateParam
    } else if (weekParam === 'current') {
      // Current week (Sunday to Saturday)
      const today = new Date()
      const dayOfWeek = today.getDay()
      const sunday = new Date(today)
      sunday.setDate(today.getDate() - dayOfWeek)
      const saturday = new Date(sunday)
      saturday.setDate(sunday.getDate() + 6)
      startDate = sunday.toISOString().split('T')[0]
      endDate = saturday.toISOString().split('T')[0]
    } else if (weekParam === 'next') {
      // Next week
      const today = new Date()
      const dayOfWeek = today.getDay()
      const nextSunday = new Date(today)
      nextSunday.setDate(today.getDate() + (7 - dayOfWeek))
      const nextSaturday = new Date(nextSunday)
      nextSaturday.setDate(nextSunday.getDate() + 6)
      startDate = nextSunday.toISOString().split('T')[0]
      endDate = nextSaturday.toISOString().split('T')[0]
    } else {
      // Default: today and next 7 days
      const today = new Date()
      const weekLater = new Date(today)
      weekLater.setDate(today.getDate() + 7)
      startDate = today.toISOString().split('T')[0]
      endDate = weekLater.toISOString().split('T')[0]
    }

    // Fetch assigned workouts with session and exercise details
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
        AND aw.workout_date >= ${startDate}
        AND aw.workout_date <= ${endDate}
      ORDER BY aw.workout_date ASC, ps.start_time ASC NULLS LAST
    `

    return NextResponse.json({ workouts })
  } catch (error) {
    console.error('Get assigned workouts error:', error)
    return NextResponse.json({ error: 'Failed to get workouts' }, { status: 500 })
  }
}
