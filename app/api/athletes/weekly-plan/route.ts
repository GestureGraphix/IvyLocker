import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

// GET /api/athletes/weekly-plan - Get cached weekly plan
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check for cached plan this week
    const weekStart = getMonday()
    const cached = await sql`
      SELECT plan_json, generated_at FROM weekly_plan_cache
      WHERE user_id = ${user.id} AND week_start = ${weekStart}
    `

    if (cached.length > 0) {
      return NextResponse.json({ plan: cached[0].plan_json, generatedAt: cached[0].generated_at, cached: true })
    }

    return NextResponse.json({ plan: null })
  } catch (error) {
    console.error('Get weekly plan error:', error)
    return NextResponse.json({ error: 'Failed to get plan' }, { status: 500 })
  }
}

// POST /api/athletes/weekly-plan - Generate a new weekly plan
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const weekStart = getMonday()
    const weekEnd = new Date(weekStart + 'T00:00:00')
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Gather context
    const [profile, workouts, academics, checkins, physioPlans] = await Promise.all([
      sql`
        SELECT u.name, ap.sport, ap.calorie_goal, ap.protein_goal_grams, ap.hydration_goal_oz
        FROM users u LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
        WHERE u.id = ${user.id}
      `,
      sql`
        SELECT aw.workout_date, ps.session_type, ps.title, ps.start_time, wp.day_intensities
        FROM assigned_workouts aw
        JOIN plan_sessions ps ON ps.id = aw.plan_session_id
        JOIN plan_days pd ON pd.id = ps.plan_day_id
        JOIN weekly_plans wp ON wp.id = pd.weekly_plan_id
        WHERE aw.athlete_id = ${user.id}
          AND aw.workout_date >= ${weekStart} AND aw.workout_date < ${weekEndStr}
        ORDER BY aw.workout_date, ps.start_time
      `,
      sql`
        SELECT ai.title, ai.type, ai.due_date, c.name as course_name
        FROM academic_items ai
        LEFT JOIN courses c ON c.id = ai.course_id
        WHERE ai.user_id = ${user.id}
          AND ai.due_date >= ${weekStart} AND ai.due_date < ${weekEndStr}
          AND ai.completed = false
        ORDER BY ai.due_date
      `,
      sql`
        SELECT date, mental_state, physical_state, soreness_areas
        FROM check_in_logs
        WHERE user_id = ${user.id}
        ORDER BY date DESC LIMIT 3
      `,
      sql`
        SELECT pa.title, pa.type, pa.frequency
        FROM physio_assignments pa
        WHERE pa.athlete_id = ${user.id} AND pa.status = 'active'
      `,
    ])

    const p = profile[0] || {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    // Build context string
    let context = `Athlete: ${p.name || 'Athlete'}, Sport: ${p.sport || 'General'}\n`
    context += `Goals: ${p.calorie_goal || 2500} cal, ${p.protein_goal_grams || 150}g protein, ${p.hydration_goal_oz || 100}oz water\n\n`

    // Recent wellness
    if (checkins.length > 0) {
      context += `Recent wellness:\n`
      checkins.forEach((c: any) => {
        context += `- ${c.date}: Mental ${c.mental_state}/10, Physical ${c.physical_state}/10`
        if (c.soreness_areas?.length) context += ` (sore: ${c.soreness_areas.join(', ')})`
        context += '\n'
      })
      context += '\n'
    }

    // Workouts this week
    if (workouts.length > 0) {
      context += `Workouts this week:\n`
      workouts.forEach((w: any) => {
        const d = new Date((w.workout_date || '').slice(0, 10) + 'T12:00:00')
        context += `- ${dayNames[d.getDay()]}: ${w.title || w.session_type}${w.start_time ? ` at ${w.start_time}` : ''}\n`
      })
      context += '\n'
    }

    // Academics
    if (academics.length > 0) {
      context += `Academic deadlines:\n`
      academics.forEach((a: any) => {
        const d = new Date((a.due_date || '').slice(0, 10) + 'T12:00:00')
        context += `- ${dayNames[d.getDay()]}: ${a.title} (${a.type})${a.course_name ? ` - ${a.course_name}` : ''}\n`
      })
      context += '\n'
    }

    // Physio
    if (physioPlans.length > 0) {
      context += `Active physio protocols:\n`
      physioPlans.forEach((p: any) => {
        context += `- ${p.title} (${p.type})${p.frequency ? ` - ${p.frequency}` : ''}\n`
      })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: `You create brief, practical weekly plans for student-athletes. Output ONLY valid JSON.

For each day (Monday-Sunday), provide brief guidance on:
- food: one-line meal focus (e.g., "High protein pre-lift, carb load dinner")
- sleep: brief sleep note (e.g., "Aim for 8hrs, no screens after 10pm")
- mobility: brief mobility/recovery note (e.g., "10min hip opener, foam roll quads")
- study: brief study note based on deadlines (e.g., "Review ECON ch.5, quiz prep")
- summary: one short sentence overview of the day

Adapt based on the athlete's training load, deadlines, soreness, and wellness trends.
Keep each field to 10 words or fewer. Be specific, not generic.

Output format:
{
  "days": {
    "monday": { "summary": "...", "food": "...", "sleep": "...", "mobility": "...", "study": "..." },
    "tuesday": { ... },
    ...
  }
}`,
      messages: [{ role: 'user', content: `Create a weekly plan for this week:\n\n${context}` }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response' }, { status: 500 })
    }

    let plan
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error()
      plan = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Failed to parse plan' }, { status: 500 })
    }

    // Cache the plan
    await sql`
      INSERT INTO weekly_plan_cache (user_id, week_start, plan_json)
      VALUES (${user.id}, ${weekStart}, ${JSON.stringify(plan)})
      ON CONFLICT (user_id, week_start) DO UPDATE SET
        plan_json = ${JSON.stringify(plan)},
        generated_at = NOW()
    `

    return NextResponse.json({ plan, generatedAt: new Date().toISOString(), cached: false })
  } catch (error) {
    console.error('Generate weekly plan error:', error)
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 })
  }
}

function getMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return monday.toISOString().split('T')[0]
}
