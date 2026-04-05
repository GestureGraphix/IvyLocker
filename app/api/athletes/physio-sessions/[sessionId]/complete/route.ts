import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

type Params = { params: Promise<{ sessionId: string }> }

// POST /api/athletes/physio-sessions/[sessionId]/complete - Mark session complete
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params
    const body = await request.json().catch(() => ({}))
    const { perceived_effort, notes } = body

    // Verify the session belongs to an active program for this athlete
    const session = await sql`
      SELECT ps.id FROM physio_program_sessions ps
      JOIN physio_assignments pa ON pa.id = ps.assignment_id
      WHERE ps.id = ${sessionId} AND pa.athlete_id = ${user.id} AND pa.status = 'active'
    `
    if (session.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await sql`
      INSERT INTO physio_session_completions (session_id, athlete_id, perceived_effort, notes)
      VALUES (${sessionId}, ${user.id}, ${perceived_effort || null}, ${notes || null})
      ON CONFLICT (session_id, athlete_id) DO UPDATE SET
        completed_at = NOW(),
        perceived_effort = COALESCE(${perceived_effort || null}, physio_session_completions.perceived_effort),
        notes = COALESCE(${notes || null}, physio_session_completions.notes)
    `

    return NextResponse.json({ message: 'Session marked complete' })
  } catch (error) {
    console.error('Complete session error:', error)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}

// DELETE /api/athletes/physio-sessions/[sessionId]/complete - Un-mark session
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await params

    await sql`
      DELETE FROM physio_session_completions
      WHERE session_id = ${sessionId} AND athlete_id = ${user.id}
    `

    return NextResponse.json({ message: 'Session completion removed' })
  } catch (error) {
    console.error('Uncomplete session error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
