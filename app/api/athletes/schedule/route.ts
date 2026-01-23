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
    const assignedWorkoutsRaw = await sql`
      SELECT
        aw.id,
        TO_CHAR(aw.workout_date, 'YYYY-MM-DD') as date,
        aw.completed,
        ps.session_type as type,
        COALESCE(ps.title, INITCAP(ps.session_type) || ' Session') as title,
        TO_CHAR(ps.start_time, 'HH24:MI') as start_time,
        TO_CHAR(ps.end_time, 'HH24:MI') as end_time,
        ps.location,
        ps.is_optional,
        wp.name as plan_name,
        u.name as coach_name
      FROM assigned_workouts aw
      JOIN plan_sessions ps ON ps.id = aw.plan_session_id
      JOIN plan_days pd ON pd.id = ps.plan_day_id
      JOIN weekly_plans wp ON wp.id = pd.weekly_plan_id
      JOIN users u ON u.id = wp.coach_id
      WHERE aw.athlete_id = ${user.id}
        AND aw.workout_date >= ${startDate}::date
        AND aw.workout_date <= ${endDate}::date
      ORDER BY aw.workout_date, ps.start_time
    `
    const assignedWorkouts = assignedWorkoutsRaw.map((w: Record<string, unknown>) => ({
      ...w,
      item_type: 'coach_workout'
    }))

    // Fetch self-created sessions
    const sessionsRaw = await sql`
      SELECT
        id,
        TO_CHAR(DATE(start_at), 'YYYY-MM-DD') as date,
        completed,
        type,
        title,
        start_at,
        end_at,
        intensity,
        focus
      FROM sessions
      WHERE user_id = ${user.id}
        AND DATE(start_at) >= ${startDate}::date
        AND DATE(start_at) <= ${endDate}::date
      ORDER BY start_at
    `
    const sessions = sessionsRaw.map((s: Record<string, unknown>) => ({
      ...s,
      item_type: 'session'
    }))

    // Fetch academic items (assignments, exams, etc.)
    // Note: Use DATE() to extract date part since due_date is TIMESTAMP WITH TIME ZONE
    // Without DATE(), items due after midnight wouldn't match <= endDate::date
    const academicsRaw = await sql`
      SELECT
        ai.id,
        TO_CHAR(ai.due_date, 'YYYY-MM-DD') as date,
        ai.completed,
        ai.type,
        ai.title,
        ai.priority,
        TO_CHAR(ai.due_date, 'YYYY-MM-DD') as due_date,
        c.name as course_name,
        c.code as course_code
      FROM academic_items ai
      LEFT JOIN courses c ON c.id = ai.course_id
      WHERE ai.user_id = ${user.id}
        AND DATE(ai.due_date) >= ${startDate}::date
        AND DATE(ai.due_date) <= ${endDate}::date
      ORDER BY ai.due_date, ai.priority DESC
    `
    const academics = academicsRaw.map((a: Record<string, unknown>) => ({
      ...a,
      item_type: 'academic'
    }))

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

    console.log('Schedule API - User ID:', user.id)
    console.log('Schedule API - Date range:', { startDate, endDate })
    console.log('Schedule API - Assigned workouts:', assignedWorkouts.length, assignedWorkouts.map((w: Record<string, unknown>) => ({ date: w.date, title: w.title })))
    console.log('Schedule API - Sessions:', sessions.length, sessions.map((s: Record<string, unknown>) => ({ date: s.date, title: s.title })))
    console.log('Schedule API - Academics:', academics.length, academics.map((a: Record<string, unknown>) => ({ date: a.date, title: a.title })))

    return NextResponse.json({
      assignedWorkouts,
      sessions,
      academics,
      courses,
      dateRange: { startDate, endDate },
      debug: {
        userId: user.id,
        workoutsCount: assignedWorkouts.length,
        sessionsCount: sessions.length,
        academicsCount: academics.length
      }
    })
  } catch (error) {
    console.error('Get schedule error:', error)
    return NextResponse.json({ error: 'Failed to get schedule' }, { status: 500 })
  }
}
