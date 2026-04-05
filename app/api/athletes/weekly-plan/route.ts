import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

// GET /api/athletes/weekly-plan
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const weekStart = getSunday()
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
    const message = error instanceof Error ? error.message : 'Failed to get plan'
    if (message.includes('does not exist')) {
      return NextResponse.json({ error: 'Database table missing. Run migration 023-weekly-plans-cache.sql.' }, { status: 500 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/athletes/weekly-plan
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const weekStart = getSunday()
    const weekEnd = new Date(weekStart + 'T00:00:00')
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Pull ALL relevant data in parallel
    const [profile, workouts, courses, academics, checkins, physioPlans, lastWeekNutrition, lastWeekHydration] = await Promise.all([
      // Profile + goals
      sql`
        SELECT u.name, ap.sport, ap.position, ap.team,
          ap.calorie_goal, ap.protein_goal_grams, ap.hydration_goal_oz,
          ap.height_cm, ap.weight_kg
        FROM users u LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
        WHERE u.id = ${user.id}
      `,
      // Assigned workouts with intensity + session details
      sql`
        SELECT
          aw.workout_date,
          ps.session_type, ps.title, ps.start_time, ps.end_time, ps.location,
          wp.hide_exercises, wp.day_intensities,
          COALESCE(
            json_agg(json_build_object('name', pe.name, 'details', pe.details))
            FILTER (WHERE pe.id IS NOT NULL AND wp.hide_exercises = false),
            '[]'
          ) as exercises
        FROM assigned_workouts aw
        JOIN plan_sessions ps ON ps.id = aw.plan_session_id
        JOIN plan_days pd ON pd.id = ps.plan_day_id
        JOIN weekly_plans wp ON wp.id = pd.weekly_plan_id
        LEFT JOIN plan_exercises pe ON pe.plan_session_id = ps.id
        WHERE aw.athlete_id = ${user.id}
          AND aw.workout_date >= ${weekStart} AND aw.workout_date < ${weekEndStr}
        GROUP BY aw.id, ps.id, wp.id
        ORDER BY aw.workout_date, ps.start_time
      `,
      // Course schedule
      sql`
        SELECT name, code, schedule, meeting_days
        FROM courses WHERE user_id = ${user.id}
      `,
      // Academic deadlines
      sql`
        SELECT ai.title, ai.type, ai.due_date, ai.priority, c.name as course_name, c.code as course_code
        FROM academic_items ai
        LEFT JOIN courses c ON c.id = ai.course_id
        WHERE ai.user_id = ${user.id}
          AND ai.due_date >= ${weekStart} AND ai.due_date < ${weekEndStr}
          AND ai.completed = false
        ORDER BY ai.due_date
      `,
      // Recent check-ins (last 7 days for trend)
      sql`
        SELECT date, mental_state, physical_state, soreness_areas
        FROM check_in_logs
        WHERE user_id = ${user.id}
        ORDER BY date DESC LIMIT 7
      `,
      // Active physio plans with descriptions
      sql`
        SELECT pa.title, pa.type, pa.frequency, pa.description,
          u.name as physio_name
        FROM physio_assignments pa
        JOIN users u ON u.id = pa.physio_id
        WHERE pa.athlete_id = ${user.id} AND pa.status = 'active'
      `,
      // Last week's nutrition averages (for context on actual eating patterns)
      sql`
        SELECT
          AVG(daily.cals)::int as avg_calories,
          AVG(daily.prot)::int as avg_protein,
          AVG(daily.carbs)::int as avg_carbs,
          AVG(daily.fat)::int as avg_fat
        FROM (
          SELECT date_time::date, SUM(calories) as cals, SUM(protein_grams) as prot,
            SUM(carbs_grams) as carbs, SUM(fat_grams) as fat
          FROM meal_logs
          WHERE user_id = ${user.id}
            AND date_time >= (${weekStart}::date - 7) AND date_time < ${weekStart}
          GROUP BY date_time::date
        ) daily
      `,
      // Last week's hydration
      sql`
        SELECT AVG(daily.oz)::int as avg_oz
        FROM (
          SELECT date, SUM(ounces) as oz
          FROM hydration_logs
          WHERE user_id = ${user.id}
            AND date >= (${weekStart}::date - 7) AND date < ${weekStart}
          GROUP BY date
        ) daily
      `,
    ])

    const p = profile[0] || {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    // Build rich context
    let ctx = `=== ATHLETE PROFILE ===\n`
    ctx += `Name: ${p.name || 'Athlete'}\n`
    ctx += `Sport: ${p.sport || 'General'}${p.position ? `, Position: ${p.position}` : ''}${p.team ? `, Team: ${p.team}` : ''}\n`
    ctx += `Daily goals: ${p.calorie_goal || 2500} cal, ${p.protein_goal_grams || 150}g protein, ${p.hydration_goal_oz || 100}oz water\n`

    // Last week's actual nutrition
    const lastNut = lastWeekNutrition[0]
    const lastHyd = lastWeekHydration[0]
    if (lastNut?.avg_calories) {
      ctx += `\n=== LAST WEEK'S ACTUAL NUTRITION ===\n`
      ctx += `Avg daily: ${lastNut.avg_calories} cal (goal: ${p.calorie_goal || 2500}), `
      ctx += `${lastNut.avg_protein}g protein (goal: ${p.protein_goal_grams || 150}g), `
      ctx += `${lastNut.avg_carbs}g carbs, ${lastNut.avg_fat}g fat\n`
      if (lastNut.avg_calories < (p.calorie_goal || 2500) - 200) ctx += `⚠️ UNDER-EATING by ~${(p.calorie_goal || 2500) - lastNut.avg_calories} cal/day\n`
      if (lastNut.avg_protein < (p.protein_goal_grams || 150) - 20) ctx += `⚠️ LOW PROTEIN by ~${(p.protein_goal_grams || 150) - lastNut.avg_protein}g/day\n`
    }
    if (lastHyd?.avg_oz) {
      ctx += `Avg hydration: ${lastHyd.avg_oz}oz/day (goal: ${p.hydration_goal_oz || 100}oz)\n`
      if (lastHyd.avg_oz < (p.hydration_goal_oz || 100) - 15) ctx += `⚠️ UNDER-HYDRATING by ~${(p.hydration_goal_oz || 100) - lastHyd.avg_oz}oz/day\n`
    }

    // Wellness trend
    if (checkins.length > 0) {
      ctx += `\n=== RECENT WELLNESS (last ${checkins.length} days) ===\n`
      const mentalAvg = Math.round(checkins.reduce((s: number, c: any) => s + (c.mental_state || 0), 0) / checkins.length * 10) / 10
      const physicalAvg = Math.round(checkins.reduce((s: number, c: any) => s + (c.physical_state || 0), 0) / checkins.length * 10) / 10
      ctx += `Mental avg: ${mentalAvg}/10, Physical avg: ${physicalAvg}/10\n`
      if (mentalAvg < 5) ctx += `⚠️ MENTAL HEALTH TRENDING LOW — prioritize rest and recovery\n`
      if (physicalAvg < 5) ctx += `⚠️ PHYSICAL STATE LOW — reduce training load, increase recovery\n`

      const allSoreness: string[] = []
      checkins.forEach((c: any) => {
        if (c.soreness_areas && Array.isArray(c.soreness_areas)) allSoreness.push(...c.soreness_areas)
      })
      if (allSoreness.length > 0) {
        const counts: Record<string, number> = {}
        allSoreness.forEach((a) => { counts[a] = (counts[a] || 0) + 1 })
        const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
        ctx += `Sore areas: ${sorted.map(([area, count]) => `${area} (${count}x)`).join(', ')}\n`
      }
    }

    // This week's workouts by day
    ctx += `\n=== THIS WEEK'S TRAINING SCHEDULE ===\n`
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T12:00:00')
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName = dayNames[d.getDay()]
      const dayKey = dayKeys[d.getDay()]

      const dayWorkouts = workouts.filter((w: any) => (w.workout_date || '').slice(0, 10) === dateStr)

      if (dayWorkouts.length === 0) {
        // Check if there's intensity data
        const intensity = dayWorkouts.length === 0
          ? workouts.find((w: any) => w.day_intensities)?.[dayKey] || null
          : null
        ctx += `${dayName}: No assigned workouts${intensity ? ` (planned intensity: ${intensity})` : ''}\n`
      } else {
        const parts = dayWorkouts.map((w: any) => {
          let s = `${w.title || w.session_type}`
          if (w.start_time) s += ` at ${w.start_time}`
          if (w.location) s += ` (${w.location})`
          // Get intensity from day_intensities
          if (w.day_intensities && w.day_intensities[dayKey]) {
            s += ` [${w.day_intensities[dayKey]} intensity]`
          }
          const exList = Array.isArray(w.exercises) ? w.exercises : []
          if (exList.length > 0 && exList[0]?.name) {
            s += ` — ${exList.slice(0, 4).map((e: any) => e.name).join(', ')}`
            if (exList.length > 4) s += `... (+${exList.length - 4} more)`
          }
          return s
        })
        ctx += `${dayName}: ${parts.join(' | ')}\n`
      }
    }

    // Course schedule
    if (courses.length > 0) {
      ctx += `\n=== CLASS SCHEDULE ===\n`
      courses.forEach((c: any) => {
        ctx += `- ${c.code || c.name}: ${c.schedule || 'No schedule'}${c.meeting_days?.length ? ` (${c.meeting_days.join('/')})` : ''}\n`
      })
    }

    // Academic deadlines
    if (academics.length > 0) {
      ctx += `\n=== DEADLINES THIS WEEK ===\n`
      academics.forEach((a: any) => {
        const d = new Date((a.due_date || '').slice(0, 10) + 'T12:00:00')
        ctx += `- ${dayNames[d.getDay()]}: ${a.title} (${a.type}${a.priority ? `, ${a.priority} priority` : ''})${a.course_code ? ` — ${a.course_code}` : ''}\n`
      })
    }

    // Physio protocols
    if (physioPlans.length > 0) {
      ctx += `\n=== ACTIVE PHYSIO PROTOCOLS ===\n`
      physioPlans.forEach((pp: any) => {
        ctx += `- ${pp.title} (${pp.type}) from ${pp.physio_name}${pp.frequency ? ` — ${pp.frequency}` : ''}\n`
        if (pp.description) {
          // Include first 200 chars of the plan
          ctx += `  Protocol: ${pp.description.slice(0, 200)}${pp.description.length > 200 ? '...' : ''}\n`
        }
      })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: `You create hyper-personalized weekly plans for student-athletes. You MUST use the specific data provided — reference actual workout types, actual course names, actual deadlines, actual soreness areas, and actual nutrition gaps.

RULES:
- FOOD: Reference their actual calorie/protein gaps. If they're under-eating, say exactly what to add. Name specific meal types around their actual training times (e.g., "Extra protein shake post-lift since you're 30g under daily").
- SLEEP: Adjust based on training load that day and mental state. Heavier days = earlier bedtime. If mental health is low, suggest wind-down routines.
- MOBILITY: Target their ACTUAL sore areas from check-ins. Reference their physio protocol by name. On heavy training days, specify what to foam roll. On rest days, suggest longer sessions for problem areas.
- STUDY: Reference ACTUAL assignment names, course codes, and due dates. Prioritize by deadline proximity and priority level. Be specific: "Finish ECON 3350 problem set" not "study for classes."
- SUMMARY: One sentence that ties the day together based on what's actually happening.

NEVER be generic. Every line must reference specific data from their profile.
If they have no data for a category, say "No data yet — track [X] to get personalized advice."

Output ONLY valid JSON:
{
  "days": {
    "monday": { "summary": "...", "food": "...", "sleep": "...", "mobility": "...", "study": "..." },
    "tuesday": { ... }, "wednesday": { ... }, "thursday": { ... },
    "friday": { ... }, "saturday": { ... }, "sunday": { ... }
  }
}`,
      messages: [{ role: 'user', content: `Create a personalized weekly plan using ALL of this data:\n\n${ctx}` }],
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
    const message = error instanceof Error ? error.message : 'Failed to generate plan'
    if (message.includes('does not exist')) {
      return NextResponse.json({ error: 'Database table missing. Run migration 023-weekly-plans-cache.sql.' }, { status: 500 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getSunday(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day)
  return sunday.toISOString().split('T')[0]
}
