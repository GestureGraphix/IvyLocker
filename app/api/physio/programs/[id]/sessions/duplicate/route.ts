import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// POST /api/physio/programs/[id]/sessions/duplicate - Clone a session to a new date
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { source_session_id, target_date } = body

    if (!source_session_id || !target_date) {
      return NextResponse.json({ error: 'source_session_id and target_date are required' }, { status: 400 })
    }

    // Verify source session belongs to this program and physio
    const source = await sql`
      SELECT ps.id, ps.title, ps.notes
      FROM physio_program_sessions ps
      JOIN physio_assignments pa ON pa.id = ps.assignment_id
      WHERE ps.id = ${source_session_id}
        AND ps.assignment_id = ${id}
        AND pa.physio_id = ${user.id}
    `
    if (source.length === 0) {
      return NextResponse.json({ error: 'Source session not found' }, { status: 404 })
    }

    // Create the new session
    const newSession = await sql`
      INSERT INTO physio_program_sessions (assignment_id, session_date, title, notes)
      VALUES (${id}, ${target_date}, ${source[0].title}, ${source[0].notes})
      RETURNING id
    `
    const newSessionId = newSession[0].id

    // Copy exercises
    const exercises = await sql`
      SELECT exercise_id, name, sets, reps, hold_seconds, duration_seconds,
             rest_seconds, side, notes, sort_order
      FROM physio_session_exercises
      WHERE session_id = ${source_session_id}
      ORDER BY sort_order
    `

    for (const ex of exercises) {
      await sql`
        INSERT INTO physio_session_exercises (
          session_id, exercise_id, name, sets, reps,
          hold_seconds, duration_seconds, rest_seconds, side, notes, sort_order
        ) VALUES (
          ${newSessionId}, ${ex.exercise_id}, ${ex.name},
          ${ex.sets}, ${ex.reps},
          ${ex.hold_seconds}, ${ex.duration_seconds},
          ${ex.rest_seconds}, ${ex.side}, ${ex.notes}, ${ex.sort_order}
        )
      `
    }

    return NextResponse.json({
      sessionId: newSessionId,
      message: `Session duplicated to ${target_date}`,
      exerciseCount: exercises.length,
    }, { status: 201 })
  } catch (error) {
    console.error('Duplicate session error:', error)
    if ((error as Error).message?.includes('idx_physio_sessions_assign_date')) {
      return NextResponse.json({ error: 'A session already exists for this date' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to duplicate session' }, { status: 500 })
  }
}
