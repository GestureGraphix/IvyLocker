import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/schedule - Get all scheduled items for a date range
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Default to current week (Sunday to Saturday)
    let startDate: string
    let endDate: string

    if (startDateParam && endDateParam) {
      startDate = startDateParam
      endDate = endDateParam
    } else {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const sunday = new Date(today)
      sunday.setDate(today.getDate() - dayOfWeek)
      const saturday = new Date(sunday)
      saturday.setDate(sunday.getDate() + 6)
      startDate = sunday.toISOString().split('T')[0]
      endDate = saturday.toISOString().split('T')[0]
    }

    // Fetch coach-assigned workouts
    const assignedWorkouts = await sql`
      SELECT
        aw.id,
        aw.workout_date as date,
        aw.completed,
        ps.session_type as type,
        ps.title,
        ps.start_time,
        ps.end_time,
        ps.location,
        ps.is_optional,
        wp.name as plan_name,
        u.name as coach_name,
        'coach_workout' as item_type
      FROM assigned_workouts aw
      JOIN plan_sessions ps ON ps.id = aw.plan_session_id
      JOIN plan_days pd ON pd.id = ps.plan_day_id
      JOIN weekly_plans wp ON wp.id = pd.weekly_plan_id
      JOIN users u ON u.id = wp.coach_id
      WHERE aw.athlete_id = ${user.id}
        AND aw.workout_date >= ${startDate}
        AND aw.workout_date <= ${endDate}
      ORDER BY aw.workout_date, ps.start_time
    `

    // Fetch self-created sessions
    const sessions = await sql`
      SELECT
        id,
        DATE(start_at) as date,
        completed,
        type,
        title,
        start_at,
        end_at,
        intensity,
        focus,
        'session' as item_type
      FROM sessions
      WHERE user_id = ${user.id}
        AND DATE(start_at) >= ${startDate}
        AND DATE(start_at) <= ${endDate}
      ORDER BY start_at
    `

    // Fetch academic items (assignments, exams, etc.)
    const academics = await sql`
      SELECT
        ai.id,
        ai.due_date as date,
        ai.completed,
        ai.type,
        ai.title,
        ai.priority,
        ai.due_date,
        c.name as course_name,
        c.code as course_code,
        'academic' as item_type
      FROM academic_items ai
      LEFT JOIN courses c ON c.id = ai.course_id
      WHERE ai.user_id = ${user.id}
        AND ai.due_date >= ${startDate}
        AND ai.due_date <= ${endDate}
      ORDER BY ai.due_date, ai.priority DESC
    `

    // Fetch courses for class schedule
    const courses = await sql`
      SELECT
        id,
        name,
        code,
        schedule,
        location,
        start_time,
        end_time
      FROM courses
      WHERE user_id = ${user.id}
    `

    return NextResponse.json({
      assignedWorkouts,
      sessions,
      academics,
      courses,
      dateRange: { startDate, endDate }
    })
  } catch (error) {
    console.error('Get schedule error:', error)
    return NextResponse.json({ error: 'Failed to get schedule' }, { status: 500 })
  }
}
