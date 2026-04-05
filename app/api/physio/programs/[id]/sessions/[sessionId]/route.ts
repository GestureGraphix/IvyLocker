import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

type Params = { params: Promise<{ id: string; sessionId: string }> }

// GET /api/physio/programs/[id]/sessions/[sessionId]
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, sessionId } = await params

    const sessions = await sql`
      SELECT
        ps.id, ps.session_date, ps.title, ps.notes, ps.sort_order,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pse.id,
              'exercise_id', pse.exercise_id,
              'name', pse.name,
              'sets', pse.sets,
              'reps', pse.reps,
              'hold_seconds', pse.hold_seconds,
              'duration_seconds', pse.duration_seconds,
              'rest_seconds', pse.rest_seconds,
              'side', pse.side,
              'notes', pse.notes,
              'sort_order', pse.sort_order
            ) ORDER BY pse.sort_order
          ) FILTER (WHERE pse.id IS NOT NULL),
          '[]'
        ) as exercises
      FROM physio_program_sessions ps
      LEFT JOIN physio_session_exercises pse ON pse.session_id = ps.id
      WHERE ps.id = ${sessionId}
        AND ps.assignment_id = ${id}
      GROUP BY ps.id
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session: sessions[0] })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}

// PATCH /api/physio/programs/[id]/sessions/[sessionId] - Update session + replace exercises
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, sessionId } = await params

    // Verify ownership
    const existing = await sql`
      SELECT ps.id FROM physio_program_sessions ps
      JOIN physio_assignments pa ON pa.id = ps.assignment_id
      WHERE ps.id = ${sessionId} AND ps.assignment_id = ${id} AND pa.physio_id = ${user.id}
    `
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const { session_date, title, notes, exercises } = body

    // Update session metadata
    await sql`
      UPDATE physio_program_sessions SET
        session_date = COALESCE(${session_date || null}, session_date),
        title = ${title !== undefined ? title : null},
        notes = ${notes !== undefined ? notes : null},
        updated_at = NOW()
      WHERE id = ${sessionId}
    `

    // Replace exercises if provided
    if (exercises && Array.isArray(exercises)) {
      // Delete existing exercises (cascade deletes completions)
      await sql`DELETE FROM physio_session_exercises WHERE session_id = ${sessionId}`

      // Insert new exercises
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        await sql`
          INSERT INTO physio_session_exercises (
            session_id, exercise_id, name, sets, reps,
            hold_seconds, duration_seconds, rest_seconds, side, notes, sort_order
          ) VALUES (
            ${sessionId}, ${ex.exercise_id || null}, ${ex.name},
            ${ex.sets || null}, ${ex.reps || null},
            ${ex.hold_seconds || null}, ${ex.duration_seconds || null},
            ${ex.rest_seconds || null}, ${ex.side || null}, ${ex.notes || null}, ${i}
          )
        `
      }
    }

    return NextResponse.json({ message: 'Session updated' })
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

// DELETE /api/physio/programs/[id]/sessions/[sessionId]
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, sessionId } = await params

    const result = await sql`
      DELETE FROM physio_program_sessions ps
      USING physio_assignments pa
      WHERE ps.id = ${sessionId}
        AND ps.assignment_id = ${id}
        AND pa.id = ps.assignment_id
        AND pa.physio_id = ${user.id}
      RETURNING ps.id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Session deleted' })
  } catch (error) {
    console.error('Delete session error:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
