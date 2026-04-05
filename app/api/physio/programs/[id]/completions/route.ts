import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/physio/programs/[id]/completions - Get compliance data for a program
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the assignment belongs to this physio
    const assignment = await sql`
      SELECT id, athlete_id FROM physio_assignments WHERE id = ${id} AND physio_id = ${user.id}
    `
    if (assignment.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const athleteId = assignment[0].athlete_id

    // Get all sessions with exercise-level completion data
    const sessions = await sql`
      SELECT
        ps.id as session_id,
        ps.session_date,
        ps.title,
        -- Session completion
        sc.id IS NOT NULL as session_completed,
        sc.completed_at as session_completed_at,
        sc.perceived_effort,
        sc.notes as session_notes,
        -- Exercise completion details
        COALESCE(
          json_agg(
            json_build_object(
              'id', pse.id,
              'name', pse.name,
              'completed', (ec.id IS NOT NULL),
              'completed_at', ec.completed_at,
              'pain_level', ec.pain_level,
              'athlete_notes', ec.notes
            ) ORDER BY pse.sort_order
          ) FILTER (WHERE pse.id IS NOT NULL),
          '[]'
        ) as exercises,
        -- Counts
        COUNT(pse.id)::int as total_exercises,
        COUNT(ec.id)::int as completed_exercises
      FROM physio_program_sessions ps
      LEFT JOIN physio_session_completions sc ON sc.session_id = ps.id AND sc.athlete_id = ${athleteId}
      LEFT JOIN physio_session_exercises pse ON pse.session_id = ps.id
      LEFT JOIN physio_exercise_completions ec ON ec.exercise_id = pse.id AND ec.athlete_id = ${athleteId}
      WHERE ps.assignment_id = ${id}
      GROUP BY ps.id, sc.id
      ORDER BY ps.session_date
    `

    // Aggregate stats
    const totalSessions = sessions.length
    const completedSessions = sessions.filter((s: { session_completed: boolean }) => s.session_completed).length
    const totalExercises = sessions.reduce((sum: number, s: { total_exercises: number }) => sum + s.total_exercises, 0)
    const completedExercises = sessions.reduce((sum: number, s: { completed_exercises: number }) => sum + s.completed_exercises, 0)

    return NextResponse.json({
      sessions,
      stats: {
        totalSessions,
        completedSessions,
        sessionCompliancePercent: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        totalExercises,
        completedExercises,
        exerciseCompliancePercent: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Get completions error:', error)
    return NextResponse.json({ error: 'Failed to get completions' }, { status: 500 })
  }
}
