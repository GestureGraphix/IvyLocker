import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

type Params = { params: Promise<{ sessionId: string; exerciseId: string }> }

// POST - Mark exercise complete
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, exerciseId } = await params
    const body = await request.json().catch(() => ({}))
    const { notes, pain_level } = body

    // Verify the exercise belongs to a session in an active program for this athlete
    const exercise = await sql`
      SELECT pse.id FROM physio_session_exercises pse
      JOIN physio_program_sessions ps ON ps.id = pse.session_id
      JOIN physio_assignments pa ON pa.id = ps.assignment_id
      WHERE pse.id = ${exerciseId}
        AND ps.id = ${sessionId}
        AND pa.athlete_id = ${user.id}
        AND pa.status = 'active'
    `
    if (exercise.length === 0) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    await sql`
      INSERT INTO physio_exercise_completions (exercise_id, athlete_id, notes, pain_level)
      VALUES (${exerciseId}, ${user.id}, ${notes || null}, ${pain_level || null})
      ON CONFLICT (exercise_id, athlete_id) DO UPDATE SET
        completed_at = NOW(),
        notes = COALESCE(${notes || null}, physio_exercise_completions.notes),
        pain_level = COALESCE(${pain_level || null}, physio_exercise_completions.pain_level)
    `

    return NextResponse.json({ message: 'Exercise marked complete' })
  } catch (error) {
    console.error('Complete exercise error:', error)
    return NextResponse.json({ error: 'Failed to complete exercise' }, { status: 500 })
  }
}

// DELETE - Un-mark exercise
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exerciseId } = await params

    await sql`
      DELETE FROM physio_exercise_completions
      WHERE exercise_id = ${exerciseId} AND athlete_id = ${user.id}
    `

    return NextResponse.json({ message: 'Exercise completion removed' })
  } catch (error) {
    console.error('Uncomplete exercise error:', error)
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 })
  }
}
