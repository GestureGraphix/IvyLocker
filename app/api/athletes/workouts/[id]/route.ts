import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/workouts/[id] - Get a single assigned workout
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await sql`
      SELECT
        aw.id,
        aw.workout_date,
        aw.completed,
        aw.completed_at,
        aw.notes as athlete_notes,
        aw.perceived_effort,
        ps.id as session_id,
        ps.session_type,
        ps.title as session_title,
        ps.start_time,
        ps.end_time,
        ps.location,
        ps.is_optional,
        wp.name as plan_name,
        u.name as coach_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', pe.id,
              'name', pe.name,
              'details', pe.details,
              'sort_order', pe.sort_order
            ) ORDER BY pe.sort_order
          )
          FROM plan_exercises pe
          WHERE pe.plan_session_id = ps.id
        ) as exercises
      FROM assigned_workouts aw
      JOIN plan_sessions ps ON ps.id = aw.plan_session_id
      JOIN plan_days pd ON pd.id = ps.plan_day_id
      JOIN weekly_plans wp ON wp.id = pd.weekly_plan_id
      JOIN users u ON u.id = wp.coach_id
      WHERE aw.id = ${id} AND aw.athlete_id = ${user.id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    return NextResponse.json({ workout: result[0] })
  } catch (error) {
    console.error('Get workout error:', error)
    return NextResponse.json({ error: 'Failed to get workout' }, { status: 500 })
  }
}

// PATCH /api/athletes/workouts/[id] - Update workout (mark complete, add notes, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { completed, notes, perceived_effort } = body

    // Verify ownership
    const existing = await sql`
      SELECT id FROM assigned_workouts
      WHERE id = ${id} AND athlete_id = ${user.id}
    `

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: Record<string, unknown> = { id }

    if (typeof completed === 'boolean') {
      if (completed) {
        await sql`
          UPDATE assigned_workouts
          SET completed = true, completed_at = NOW()
          WHERE id = ${id}
        `
      } else {
        await sql`
          UPDATE assigned_workouts
          SET completed = false, completed_at = NULL
          WHERE id = ${id}
        `
      }
    }

    if (notes !== undefined) {
      await sql`
        UPDATE assigned_workouts
        SET notes = ${notes}
        WHERE id = ${id}
      `
    }

    if (perceived_effort !== undefined) {
      await sql`
        UPDATE assigned_workouts
        SET perceived_effort = ${perceived_effort}
        WHERE id = ${id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update workout error:', error)
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
  }
}
