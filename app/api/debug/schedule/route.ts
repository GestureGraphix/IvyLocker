import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// Debug endpoint to check schedule data - remove in production
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({
        error: 'Not authenticated',
        message: 'No user session found. Please log in.',
        fix: 'Go to /login and sign in first'
      })
    }

    // Current date info
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek)
    const saturday = new Date(sunday)
    saturday.setDate(sunday.getDate() + 6)

    const startDate = sunday.toISOString().split('T')[0]
    const endDate = saturday.toISOString().split('T')[0]

    // Get counts of ALL items (not just this week)
    const [academicCountAll] = await sql`
      SELECT COUNT(*) as count FROM academic_items WHERE user_id = ${user.id}
    `

    const [academicCountThisWeek] = await sql`
      SELECT COUNT(*) as count FROM academic_items
      WHERE user_id = ${user.id}
        AND DATE(due_date) >= ${startDate}::date
        AND DATE(due_date) <= ${endDate}::date
    `

    const [sessionCountAll] = await sql`
      SELECT COUNT(*) as count FROM sessions WHERE user_id = ${user.id}
    `

    const [sessionCountThisWeek] = await sql`
      SELECT COUNT(*) as count FROM sessions
      WHERE user_id = ${user.id}
        AND DATE(start_at) >= ${startDate}::date
        AND DATE(start_at) <= ${endDate}::date
    `

    // Check if assigned_workouts table exists and has data
    let assignedWorkoutCountAll = { count: 0 }
    let assignedWorkoutCountThisWeek = { count: 0 }
    try {
      const [result] = await sql`
        SELECT COUNT(*) as count FROM assigned_workouts WHERE athlete_id = ${user.id}
      `
      assignedWorkoutCountAll = result

      const [result2] = await sql`
        SELECT COUNT(*) as count FROM assigned_workouts
        WHERE athlete_id = ${user.id}
          AND workout_date >= ${startDate}::date
          AND workout_date <= ${endDate}::date
      `
      assignedWorkoutCountThisWeek = result2
    } catch (e) {
      assignedWorkoutCountAll = { count: 'table may not exist - run migration 007' } as any
    }

    // Get ALL academic items (to see what dates they have)
    const allAcademics = await sql`
      SELECT id, title, due_date, type, completed
      FROM academic_items
      WHERE user_id = ${user.id}
      ORDER BY due_date DESC
      LIMIT 10
    `

    // Get ALL sessions
    const allSessions = await sql`
      SELECT id, title, start_at, type, completed
      FROM sessions
      WHERE user_id = ${user.id}
      ORDER BY start_at DESC
      LIMIT 10
    `

    // Get ALL assigned workouts
    let allWorkouts: unknown[] = []
    try {
      allWorkouts = await sql`
        SELECT aw.id, aw.workout_date, ps.title, ps.session_type
        FROM assigned_workouts aw
        JOIN plan_sessions ps ON ps.id = aw.plan_session_id
        WHERE aw.athlete_id = ${user.id}
        ORDER BY aw.workout_date DESC
        LIMIT 10
      `
    } catch (e) {
      // table doesn't exist
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      currentWeek: {
        start: startDate,
        end: endDate,
        today: today.toISOString().split('T')[0]
      },
      counts: {
        academic_items: {
          total: academicCountAll.count,
          thisWeek: academicCountThisWeek.count
        },
        sessions: {
          total: sessionCountAll.count,
          thisWeek: sessionCountThisWeek.count
        },
        assigned_workouts: {
          total: assignedWorkoutCountAll.count,
          thisWeek: assignedWorkoutCountThisWeek.count
        }
      },
      allData: {
        academics: allAcademics.map(a => ({
          ...a,
          due_date_formatted: a.due_date,
          inCurrentWeek: new Date(a.due_date) >= sunday && new Date(a.due_date) <= saturday
        })),
        sessions: allSessions.map(s => ({
          ...s,
          start_at_formatted: s.start_at,
          inCurrentWeek: new Date(s.start_at) >= sunday && new Date(s.start_at) <= saturday
        })),
        workouts: allWorkouts
      },
      diagnosis: {
        hasAnyData: Number(academicCountAll.count) > 0 || Number(sessionCountAll.count) > 0 || Number(assignedWorkoutCountAll.count) > 0,
        hasDataThisWeek: Number(academicCountThisWeek.count) > 0 || Number(sessionCountThisWeek.count) > 0 || Number(assignedWorkoutCountThisWeek.count) > 0,
        possibleIssues: []
      }
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
