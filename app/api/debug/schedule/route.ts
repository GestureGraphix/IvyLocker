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
        message: 'No user session found. Please log in.'
      })
    }

    // Get counts of items for this user
    const [academicCount] = await sql`
      SELECT COUNT(*) as count FROM academic_items WHERE user_id = ${user.id}
    `

    const [sessionCount] = await sql`
      SELECT COUNT(*) as count FROM sessions WHERE user_id = ${user.id}
    `

    // Check if assigned_workouts table exists and has data
    let assignedWorkoutCount = { count: 0 }
    try {
      const [result] = await sql`
        SELECT COUNT(*) as count FROM assigned_workouts WHERE athlete_id = ${user.id}
      `
      assignedWorkoutCount = result
    } catch (e) {
      assignedWorkoutCount = { count: 'table may not exist' } as any
    }

    // Get sample academic items
    const sampleAcademics = await sql`
      SELECT id, title, due_date, type
      FROM academic_items
      WHERE user_id = ${user.id}
      ORDER BY due_date DESC
      LIMIT 5
    `

    // Get sample sessions
    const sampleSessions = await sql`
      SELECT id, title, start_at, type
      FROM sessions
      WHERE user_id = ${user.id}
      ORDER BY start_at DESC
      LIMIT 5
    `

    // Current date info
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek)
    const saturday = new Date(sunday)
    saturday.setDate(sunday.getDate() + 6)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      counts: {
        academic_items: academicCount.count,
        sessions: sessionCount.count,
        assigned_workouts: assignedWorkoutCount.count
      },
      currentWeek: {
        start: sunday.toISOString().split('T')[0],
        end: saturday.toISOString().split('T')[0],
        today: today.toISOString().split('T')[0]
      },
      sampleData: {
        academics: sampleAcademics,
        sessions: sampleSessions
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
