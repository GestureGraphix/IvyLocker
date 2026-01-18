import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/coach/plans/[id] - Get plan details
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

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can access plans' }, { status: 403 })
    }

    // Get plan
    const planResult = await sql`
      SELECT id, name, week_start_date, status, source_text, created_at, published_at
      FROM weekly_plans
      WHERE id = ${id} AND coach_id = ${user.id}
    `

    if (planResult.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const plan = planResult[0]

    // Get days with sessions and exercises
    const days = await sql`
      SELECT
        pd.id,
        pd.day_of_week,
        pd.is_off_day,
        pd.notes
      FROM plan_days pd
      WHERE pd.weekly_plan_id = ${id}
      ORDER BY pd.day_of_week
    `

    // Get sessions for each day
    for (const day of days) {
      const sessions = await sql`
        SELECT
          ps.id,
          ps.session_type,
          ps.title,
          ps.start_time,
          ps.end_time,
          ps.location,
          ps.is_optional,
          ps.sort_order,
          (
            SELECT COALESCE(json_agg(json_build_object('id', g.id, 'name', g.name, 'slug', g.slug)), '[]'::json)
            FROM plan_session_groups psg
            JOIN athlete_groups g ON g.id = psg.group_id
            WHERE psg.plan_session_id = ps.id
          ) as groups
        FROM plan_sessions ps
        WHERE ps.plan_day_id = ${day.id}
        ORDER BY ps.sort_order
      `

      // Get exercises for each session
      for (const session of sessions) {
        const exercises = await sql`
          SELECT
            pe.id,
            pe.name,
            pe.details,
            pe.sort_order,
            (
              SELECT COALESCE(json_agg(json_build_object('id', g.id, 'name', g.name, 'slug', g.slug)), '[]'::json)
              FROM plan_exercise_groups peg
              JOIN athlete_groups g ON g.id = peg.group_id
              WHERE peg.plan_exercise_id = pe.id
            ) as groups
          FROM plan_exercises pe
          WHERE pe.plan_session_id = ${session.id}
          ORDER BY pe.sort_order
        `
        ;(session as any).exercises = exercises
      }

      ;(day as any).sessions = sessions
    }

    return NextResponse.json({
      plan: {
        ...plan,
        days,
      },
    })
  } catch (error) {
    console.error('Get plan error:', error)
    return NextResponse.json({ error: 'Failed to get plan' }, { status: 500 })
  }
}

// DELETE /api/coach/plans/[id] - Delete a plan
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can delete plans' }, { status: 403 })
    }

    const result = await sql`
      DELETE FROM weekly_plans
      WHERE id = ${id} AND coach_id = ${user.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
