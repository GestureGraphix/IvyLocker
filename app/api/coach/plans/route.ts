import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { dayNameToNumber } from '@/lib/ai/parse-workout-plan'
import type { ParsedPlan } from '@/lib/ai/parse-workout-plan'

// GET /api/coach/plans - List weekly plans
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can access plans' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const plans = await sql`
      SELECT
        wp.id,
        wp.name,
        wp.week_start_date,
        wp.status,
        wp.created_at,
        wp.published_at,
        (
          SELECT COUNT(DISTINCT pd.id)::int
          FROM plan_days pd
          WHERE pd.weekly_plan_id = wp.id AND NOT pd.is_off_day
        ) as training_days,
        (
          SELECT COUNT(DISTINCT ps.id)::int
          FROM plan_days pd
          JOIN plan_sessions ps ON ps.plan_day_id = pd.id
          WHERE pd.weekly_plan_id = wp.id
        ) as total_sessions
      FROM weekly_plans wp
      WHERE wp.coach_id = ${user.id}
        ${status ? sql`AND wp.status = ${status}` : sql``}
      ORDER BY wp.week_start_date DESC
      LIMIT 50
    `

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json({ error: 'Failed to get plans' }, { status: 500 })
  }
}

// POST /api/coach/plans - Create a new weekly plan from parsed data
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can create plans' }, { status: 403 })
    }

    const body = await request.json()
    const { name, weekStartDate, sourceText, parsedPlan } = body as {
      name?: string
      weekStartDate: string
      sourceText?: string
      parsedPlan: ParsedPlan
    }

    if (!weekStartDate || !parsedPlan) {
      return NextResponse.json({
        error: 'weekStartDate and parsedPlan are required'
      }, { status: 400 })
    }

    // Get coach's groups for mapping slugs to IDs
    const groups = await sql`
      SELECT id, slug, name FROM athlete_groups WHERE coach_id = ${user.id}
    `

    // Build a map with exact slugs and common aliases
    const groupSlugToId: Record<string, string> = {}
    groups.forEach((g: { id: string; slug: string; name: string }) => {
      // Exact slug match
      groupSlugToId[g.slug] = g.id
      // Lowercase name as fallback
      groupSlugToId[g.name.toLowerCase()] = g.id
      // Name without spaces
      groupSlugToId[g.name.toLowerCase().replace(/\s+/g, '-')] = g.id
      groupSlugToId[g.name.toLowerCase().replace(/\s+/g, '')] = g.id
    })

    // Add common aliases for track & field groups
    const aliases: Record<string, string[]> = {
      'sprints': ['short-sprints', 'ss', 'sprinters'],
      'short-sprints': ['sprints', 'ss', 'sprinters'],
      'ss': ['sprints', 'short-sprints', 'sprinters'],
      'long-sprints': ['ls', 'long-sprint'],
      'ls': ['long-sprints', 'long-sprint'],
      'hurdles': ['100h', 'hurdlers', '110h', '100m-hurdles', '110m-hurdles'],
      '100h': ['hurdles', 'hurdlers', '100m-hurdles'],
      'jumps': ['jumpers', 'horizontal-jumps'],
      'long-jump': ['lj', 'longjump'],
      'lj': ['long-jump', 'longjump'],
      'triple-jump': ['tj', 'triplejump'],
      'tj': ['triple-jump', 'triplejump'],
      'high-jump': ['hj', 'highjump'],
      'hj': ['high-jump', 'highjump'],
      'pole-vault': ['pv', 'polevault'],
      'pv': ['pole-vault', 'polevault'],
      'multi': ['multis', 'multi-events', 'decathlon', 'heptathlon'],
      'throws': ['throwers'],
      'distance': ['distance-runners'],
    }

    // For each coach group, add aliases that point to it
    groups.forEach((g: { id: string; slug: string }) => {
      const groupAliases = aliases[g.slug] || []
      groupAliases.forEach(alias => {
        if (!groupSlugToId[alias]) {
          groupSlugToId[alias] = g.id
        }
      })
    })

    // Create the weekly plan
    const planResult = await sql`
      INSERT INTO weekly_plans (coach_id, name, week_start_date, source_text, status)
      VALUES (
        ${user.id},
        ${name || `Week of ${weekStartDate}`},
        ${weekStartDate},
        ${sourceText || null},
        'draft'
      )
      RETURNING id
    `
    const planId = planResult[0].id

    // Create days, sessions, and exercises
    for (const day of parsedPlan.days) {
      const dayOfWeek = dayNameToNumber(day.dayOfWeek)

      const dayResult = await sql`
        INSERT INTO plan_days (weekly_plan_id, day_of_week, is_off_day)
        VALUES (${planId}, ${dayOfWeek}, ${day.isOffDay})
        RETURNING id
      `
      const dayId = dayResult[0].id

      if (!day.isOffDay && day.sessions) {
        for (let sessionIdx = 0; sessionIdx < day.sessions.length; sessionIdx++) {
          const session = day.sessions[sessionIdx]

          // Check if this session is intended for specific groups
          const forSpecificGroups = !!(session.forGroups && session.forGroups.length > 0)

          const sessionResult = await sql`
            INSERT INTO plan_sessions (
              plan_day_id, session_type, title, start_time, end_time,
              location, is_optional, sort_order, for_specific_groups
            )
            VALUES (
              ${dayId},
              ${session.type},
              ${session.title || null},
              ${session.startTime || null},
              ${session.endTime || null},
              ${session.location || null},
              ${session.isOptional},
              ${sessionIdx},
              ${forSpecificGroups}
            )
            RETURNING id
          `
          const sessionId = sessionResult[0].id

          // Link session to groups
          if (session.forGroups && session.forGroups.length > 0) {
            for (const groupSlug of session.forGroups) {
              const groupId = groupSlugToId[groupSlug]
              if (groupId) {
                await sql`
                  INSERT INTO plan_session_groups (plan_session_id, group_id)
                  VALUES (${sessionId}, ${groupId})
                  ON CONFLICT DO NOTHING
                `
              }
            }
          }

          // Create exercises
          if (session.exercises) {
            for (let exIdx = 0; exIdx < session.exercises.length; exIdx++) {
              const exercise = session.exercises[exIdx]

              const exerciseResult = await sql`
                INSERT INTO plan_exercises (plan_session_id, name, details, sort_order)
                VALUES (${sessionId}, ${exercise.name}, ${exercise.details || null}, ${exIdx})
                RETURNING id
              `
              const exerciseId = exerciseResult[0].id

              // Link exercise to groups
              if (exercise.forGroups && exercise.forGroups.length > 0) {
                for (const groupSlug of exercise.forGroups) {
                  const groupId = groupSlugToId[groupSlug]
                  if (groupId) {
                    await sql`
                      INSERT INTO plan_exercise_groups (plan_exercise_id, group_id)
                      VALUES (${exerciseId}, ${groupId})
                      ON CONFLICT DO NOTHING
                    `
                  }
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      planId,
      message: 'Plan created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
