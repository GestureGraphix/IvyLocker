import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/physio/programs/[id]/sessions - List sessions for a program
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
      SELECT id FROM physio_assignments WHERE id = ${id} AND physio_id = ${user.id}
    `
    if (assignment.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const sessions = await sql`
      SELECT
        ps.id, ps.session_date, ps.title, ps.notes, ps.sort_order, ps.created_at,
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
      WHERE ps.assignment_id = ${id}
      GROUP BY ps.id
      ORDER BY ps.session_date
    `

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json({ error: 'Failed to get sessions' }, { status: 500 })
  }
}

// POST /api/physio/programs/[id]/sessions - Create a session with exercises
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

    // Verify the assignment belongs to this physio
    const assignment = await sql`
      SELECT id FROM physio_assignments WHERE id = ${id} AND physio_id = ${user.id}
    `
    if (assignment.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    const body = await request.json()
    const { session_date, title, notes, exercises } = body

    if (!session_date) {
      return NextResponse.json({ error: 'session_date is required' }, { status: 400 })
    }

    // Create the session
    const sessionResult = await sql`
      INSERT INTO physio_program_sessions (assignment_id, session_date, title, notes)
      VALUES (${id}, ${session_date}, ${title || null}, ${notes || null})
      RETURNING id
    `
    const sessionId = sessionResult[0].id

    // Insert exercises
    if (exercises && Array.isArray(exercises) && exercises.length > 0) {
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

    return NextResponse.json({ sessionId, message: 'Session created' }, { status: 201 })
  } catch (error) {
    console.error('Create session error:', error)
    if ((error as Error).message?.includes('idx_physio_sessions_assign_date')) {
      return NextResponse.json({ error: 'A session already exists for this date in this program' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
