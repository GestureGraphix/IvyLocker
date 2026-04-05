import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/physio-sessions - Get today's (or specified date's) physio sessions
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const history = searchParams.get('history') === 'true'

    // Get sessions — either for a specific date, or completed history
    const sessions = await sql`
      SELECT
        ps.id as session_id,
        ps.session_date,
        ps.title as session_title,
        ps.notes as session_notes,
        pa.id as program_id,
        pa.title as program_title,
        pa.type as program_type,
        u.name as physio_name,
        -- Session completion
        sc.id as session_completion_id,
        sc.completed_at as session_completed_at,
        sc.perceived_effort,
        sc.notes as completion_notes,
        -- Exercises with their completion status
        COALESCE(
          json_agg(
            json_build_object(
              'id', pse.id,
              'name', pse.name,
              'sets', pse.sets,
              'reps', pse.reps,
              'hold_seconds', pse.hold_seconds,
              'duration_seconds', pse.duration_seconds,
              'rest_seconds', pse.rest_seconds,
              'side', pse.side,
              'notes', pse.notes,
              'sort_order', pse.sort_order,
              'completed', (ec.id IS NOT NULL),
              'completed_at', ec.completed_at,
              'pain_level', ec.pain_level,
              'athlete_notes', ec.notes
            ) ORDER BY pse.sort_order
          ) FILTER (WHERE pse.id IS NOT NULL),
          '[]'
        ) as exercises
      FROM physio_program_sessions ps
      JOIN physio_assignments pa ON pa.id = ps.assignment_id
      JOIN users u ON u.id = pa.physio_id
      LEFT JOIN physio_session_completions sc ON sc.session_id = ps.id AND sc.athlete_id = ${user.id}
      LEFT JOIN physio_session_exercises pse ON pse.session_id = ps.id
      LEFT JOIN physio_exercise_completions ec ON ec.exercise_id = pse.id AND ec.athlete_id = ${user.id}
      WHERE pa.athlete_id = ${user.id}
        ${history
          ? sql`AND sc.id IS NOT NULL`
          : sql`AND pa.status = 'active' AND ps.session_date = ${date}`
        }
      GROUP BY ps.id, pa.id, u.id, sc.id
      ORDER BY ps.session_date DESC
      ${history ? sql`LIMIT 50` : sql``}
    `

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Get physio sessions error:', error)
    return NextResponse.json({ error: 'Failed to get physio sessions' }, { status: 500 })
  }
}
