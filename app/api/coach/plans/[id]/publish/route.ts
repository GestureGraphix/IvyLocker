import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// POST /api/coach/plans/[id]/publish - Publish a plan to athletes
export async function POST(
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
      return NextResponse.json({ error: 'Only coaches can publish plans' }, { status: 403 })
    }

    // Get the plan and verify ownership
    const planResult = await sql`
      SELECT id, week_start_date, status
      FROM weekly_plans
      WHERE id = ${id} AND coach_id = ${user.id}
    `

    if (planResult.length === 0) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const plan = planResult[0]

    if (plan.status === 'published') {
      return NextResponse.json({ error: 'Plan is already published' }, { status: 400 })
    }

    // Get all sessions with their days and groups
    const sessions = await sql`
      SELECT
        ps.id as session_id,
        ps.for_specific_groups,
        pd.day_of_week,
        COALESCE(
          array_agg(psg.group_id) FILTER (WHERE psg.group_id IS NOT NULL),
          ARRAY[]::uuid[]
        ) as group_ids
      FROM plan_sessions ps
      JOIN plan_days pd ON pd.id = ps.plan_day_id
      LEFT JOIN plan_session_groups psg ON psg.plan_session_id = ps.id
      WHERE pd.weekly_plan_id = ${id}
      GROUP BY ps.id, ps.for_specific_groups, pd.day_of_week
    `

    // Calculate the workout date for each session based on day_of_week
    const weekStart = new Date(plan.week_start_date)

    let totalAssignments = 0

    for (const session of sessions) {
      // Calculate the actual date for this session
      const workoutDate = new Date(weekStart)
      const startDay = weekStart.getDay() // 0 = Sunday
      const targetDay = session.day_of_week
      const daysToAdd = (targetDay - startDay + 7) % 7
      workoutDate.setDate(workoutDate.getDate() + daysToAdd)
      const dateStr = workoutDate.toISOString().split('T')[0]

      // Get athletes for this session
      let athletes
      if (session.group_ids.length === 0) {
        if (session.for_specific_groups) {
          // Session was meant for specific groups but none matched - skip this session
          // This prevents assigning group-specific workouts to everyone
          continue
        }
        // No specific groups and not intended for specific groups - assign to all coach's athletes
        athletes = await sql`
          SELECT DISTINCT ca.athlete_id
          FROM coach_athletes ca
          WHERE ca.coach_id = ${user.id}
        `
      } else {
        // Assign to athletes in the specified groups
        athletes = await sql`
          SELECT DISTINCT agm.athlete_id
          FROM athlete_group_members agm
          WHERE agm.group_id = ANY(${session.group_ids})
        `
      }

      // Create assigned_workout records for each athlete
      for (const athlete of athletes) {
        await sql`
          INSERT INTO assigned_workouts (athlete_id, plan_session_id, workout_date)
          VALUES (${athlete.athlete_id}, ${session.session_id}, ${dateStr})
          ON CONFLICT (athlete_id, plan_session_id) DO NOTHING
        `
        totalAssignments++
      }
    }

    // Update plan status to published
    await sql`
      UPDATE weekly_plans
      SET status = 'published', published_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      message: `Plan published successfully. ${totalAssignments} workout assignments created.`,
      assignmentsCreated: totalAssignments,
    })
  } catch (error) {
    console.error('Publish plan error:', error)
    return NextResponse.json({ error: 'Failed to publish plan' }, { status: 500 })
  }
}
