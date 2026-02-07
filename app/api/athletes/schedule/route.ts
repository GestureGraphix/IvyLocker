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

    // Expand date range by 1 day on each side to handle timezone edge cases.
    // The frontend will filter precisely using local dates.
    const expandedStart = new Date(startDate + 'T00:00:00')
    expandedStart.setDate(expandedStart.getDate() - 1)
    const expandedEnd = new Date(endDate + 'T00:00:00')
    expandedEnd.setDate(expandedEnd.getDate() + 1)
    const queryStart = expandedStart.toISOString().split('T')[0]
    const queryEnd = expandedEnd.toISOString().split('T')[0]

    // Each query is wrapped in its own try/catch so one failure
    // (e.g. missing tables from an unrun migration) doesn't break the others.

    // Fetch coach-assigned workouts
    let assignedWorkouts: Record<string, unknown>[] = []
    try {
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
      assignedWorkouts = assignedWorkoutsRaw.map((w: Record<string, unknown>) => ({
        ...w,
        item_type: 'coach_workout'
      }))
    } catch (error) {
      console.error('Failed to fetch assigned workouts (tables may not exist):', error)
    }

    // Fetch self-created sessions
    // Return raw start_at so frontend can derive local date
    let sessions: Record<string, unknown>[] = []
    try {
      const sessionsRaw = await sql`
        SELECT
          id,
          completed,
          type,
          title,
          start_at,
          end_at,
          intensity,
          focus
        FROM sessions
        WHERE user_id = ${user.id}
          AND start_at >= ${queryStart}::date
          AND start_at < (${queryEnd}::date + interval '1 day')
        ORDER BY start_at
      `
      sessions = sessionsRaw.map((s: Record<string, unknown>) => ({
        ...s,
        item_type: 'session'
      }))
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    }

    // Fetch academic items (assignments, exams, etc.)
    // Return raw due_date so frontend can derive local date
    let academics: Record<string, unknown>[] = []
    try {
      const academicsRaw = await sql`
        SELECT
          ai.id,
          ai.completed,
          ai.type,
          ai.title,
          ai.priority,
          ai.due_date,
          c.name as course_name,
          c.code as course_code
        FROM academic_items ai
        LEFT JOIN courses c ON c.id = ai.course_id
        WHERE ai.user_id = ${user.id}
          AND ai.due_date >= ${queryStart}::date
          AND ai.due_date < (${queryEnd}::date + interval '1 day')
        ORDER BY ai.due_date, ai.priority DESC
      `
      academics = academicsRaw.map((a: Record<string, unknown>) => ({
        ...a,
        item_type: 'academic'
      }))
    } catch (error) {
      console.error('Failed to fetch academic items:', error)
    }

    // Fetch courses for class schedule
    let courses: Record<string, unknown>[] = []
    try {
      courses = await sql`
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
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    }

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
