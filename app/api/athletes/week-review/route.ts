import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

// GET /api/athletes/week-review - Get cached week review
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get last week's Monday
    const lastSunday = getLastSunday()
    const cached = await sql`
      SELECT plan_json, generated_at FROM weekly_plan_cache
      WHERE user_id = ${user.id} AND week_start = ${lastSunday}
        AND plan_json::text LIKE '%"review"%'
    `

    if (cached.length > 0) {
      return NextResponse.json({ review: cached[0].plan_json, generatedAt: cached[0].generated_at, cached: true })
    }

    return NextResponse.json({ review: null })
  } catch (error) {
    console.error('Get week review error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to get review'
    return NextResponse.json({ error: msg.includes('does not exist') ? 'Database table missing. Run migration 023.' : msg }, { status: 500 })
  }
}

// POST /api/athletes/week-review - Generate week review
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    const lastSunday = getLastSunday()
    const lastSatEnd = new Date(lastSunday + 'T00:00:00')
    lastSatEnd.setDate(lastSatEnd.getDate() + 7)
    const lastSundayEnd = lastSatEnd.toISOString().split('T')[0]

    // Gather ALL last week's data
    const [profile, checkins, nutrition, hydration, workouts, assignedWorkouts, physioLogs] = await Promise.all([
      sql`
        SELECT u.name, ap.sport, ap.calorie_goal, ap.protein_goal_grams, ap.hydration_goal_oz
        FROM users u LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
        WHERE u.id = ${user.id}
      `,
      sql`
        SELECT date, mental_state, physical_state, soreness_areas
        FROM check_in_logs
        WHERE user_id = ${user.id} AND date >= ${lastSunday} AND date < ${lastSundayEnd}
        ORDER BY date
      `,
      sql`
        SELECT date_time::date as day, SUM(calories)::int as cals, SUM(protein_grams)::int as protein,
          SUM(carbs_grams)::int as carbs, SUM(fat_grams)::int as fat, COUNT(*)::int as meals
        FROM meal_logs
        WHERE user_id = ${user.id} AND date_time >= ${lastSunday} AND date_time < ${lastSundayEnd}
        GROUP BY date_time::date ORDER BY day
      `,
      sql`
        SELECT date, SUM(ounces)::int as oz
        FROM hydration_logs
        WHERE user_id = ${user.id} AND date >= ${lastSunday} AND date < ${lastSundayEnd}
        GROUP BY date ORDER BY date
      `,
      sql`
        SELECT type, title, completed, start_at, focus
        FROM sessions
        WHERE user_id = ${user.id}
          AND (start_at >= ${lastSunday} OR scheduled_date >= ${lastSunday})
          AND (start_at < ${lastSundayEnd} OR scheduled_date < ${lastSundayEnd})
      `,
      sql`
        SELECT aw.completed, ps.session_type, ps.title
        FROM assigned_workouts aw
        JOIN plan_sessions ps ON ps.id = aw.plan_session_id
        WHERE aw.athlete_id = ${user.id}
          AND aw.workout_date >= ${lastSunday} AND aw.workout_date < ${lastSundayEnd}
      `,
      sql`
        SELECT pl.notes, pl.pain_level, pa.title as plan_title, pa.type as plan_type
        FROM physio_plan_logs pl
        JOIN physio_assignments pa ON pa.id = pl.assignment_id
        WHERE pl.athlete_id = ${user.id}
          AND pl.logged_date >= ${lastSunday} AND pl.logged_date < ${lastSundayEnd}
      `,
    ])

    const p = profile[0] || {}
    const calGoal = p.calorie_goal || 2500
    const protGoal = p.protein_goal_grams || 150
    const hydGoal = p.hydration_goal_oz || 100

    // Build detailed context
    let ctx = `=== LAST WEEK'S DATA FOR ${(p.name || 'Athlete').toUpperCase()} (${p.sport || 'General'}) ===\n\n`

    // Wellness day-by-day
    ctx += `WELLNESS CHECK-INS (${checkins.length} days):\n`
    const mentalScores: number[] = []
    const physicalScores: number[] = []
    const allSoreness: string[] = []
    const lowMentalDays: string[] = []
    const lowPhysicalDays: string[] = []

    if (checkins.length === 0) {
      ctx += `No check-ins recorded.\n`
    } else {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      checkins.forEach((c: any) => {
        const d = new Date(String(c.date || '').slice(0, 10) + 'T12:00:00')
        const dayLabel = dayNames[d.getDay()]
        ctx += `- ${dayLabel}: Mental ${c.mental_state}/10, Physical ${c.physical_state}/10`
        if (c.mental_state) mentalScores.push(c.mental_state)
        if (c.physical_state) physicalScores.push(c.physical_state)
        if (c.mental_state && c.mental_state <= 4) lowMentalDays.push(dayLabel)
        if (c.physical_state && c.physical_state <= 4) lowPhysicalDays.push(dayLabel)
        if (c.soreness_areas?.length) {
          ctx += ` — sore: ${c.soreness_areas.join(', ')}`
          allSoreness.push(...c.soreness_areas)
        }
        ctx += '\n'
      })
      const mentalAvg = mentalScores.length > 0 ? (mentalScores.reduce((a, b) => a + b, 0) / mentalScores.length).toFixed(1) : '?'
      const physicalAvg = physicalScores.length > 0 ? (physicalScores.reduce((a, b) => a + b, 0) / physicalScores.length).toFixed(1) : '?'
      ctx += `Averages: Mental ${mentalAvg}/10, Physical ${physicalAvg}/10\n`
      if (lowMentalDays.length > 0) ctx += `⚠️ LOW MENTAL DAYS: ${lowMentalDays.join(', ')} — needs attention\n`
      if (lowPhysicalDays.length > 0) ctx += `⚠️ LOW PHYSICAL DAYS: ${lowPhysicalDays.join(', ')}\n`
    }

    // Soreness patterns
    if (allSoreness.length > 0) {
      const counts: Record<string, number> = {}
      allSoreness.forEach((a) => { counts[a] = (counts[a] || 0) + 1 })
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
      ctx += `Recurring soreness: ${sorted.map(([area, count]) => `${area} (${count}x)`).join(', ')}\n`
    }

    // Nutrition day-by-day
    ctx += `\nNUTRITION (${nutrition.length} days tracked, goals: ${calGoal} cal, ${protGoal}g protein):\n`
    let totalCalDiff = 0, totalProtDiff = 0, daysUnderCal = 0, daysUnderProt = 0
    if (nutrition.length === 0) {
      ctx += `No meals logged.\n`
    } else {
      nutrition.forEach((d: any) => {
        const calDiff = d.cals - calGoal
        const protDiff = d.protein - protGoal
        totalCalDiff += calDiff
        totalProtDiff += protDiff
        if (calDiff < -200) daysUnderCal++
        if (protDiff < -20) daysUnderProt++
        ctx += `- ${String(d.day || '').slice(0, 10)}: ${d.cals} cal (${calDiff >= 0 ? '+' : ''}${calDiff}), ${d.protein}g protein (${protDiff >= 0 ? '+' : ''}${protDiff}g), ${d.meals} meals\n`
      })
      const avgCal = Math.round(nutrition.reduce((s: number, d: any) => s + d.cals, 0) / nutrition.length)
      const avgProt = Math.round(nutrition.reduce((s: number, d: any) => s + d.protein, 0) / nutrition.length)
      ctx += `Averages: ${avgCal} cal/day (goal ${calGoal}), ${avgProt}g protein/day (goal ${protGoal}g)\n`
      if (daysUnderCal >= 3) ctx += `⚠️ UNDER-EATING ${daysUnderCal} of ${nutrition.length} days\n`
      if (daysUnderProt >= 3) ctx += `⚠️ LOW PROTEIN ${daysUnderProt} of ${nutrition.length} days\n`
    }

    // Hydration
    ctx += `\nHYDRATION (goal: ${hydGoal}oz/day):\n`
    if (hydration.length === 0) {
      ctx += `No hydration logged.\n`
    } else {
      let daysUnderHyd = 0
      hydration.forEach((d: any) => {
        if (d.oz < hydGoal - 15) daysUnderHyd++
      })
      const avgOz = Math.round(hydration.reduce((s: number, d: any) => s + d.oz, 0) / hydration.length)
      ctx += `Average: ${avgOz}oz/day. Under-hydrated ${daysUnderHyd} of ${hydration.length} days.\n`
    }

    // Workouts
    const allWorkouts = [
      ...workouts.map((w: any) => ({ type: w.type, completed: w.completed, title: w.title })),
      ...assignedWorkouts.map((w: any) => ({ type: w.session_type, completed: w.completed, title: w.title })),
    ]
    ctx += `\nWORKOUTS (${allWorkouts.length} total):\n`
    if (allWorkouts.length === 0) {
      ctx += `No workouts.\n`
    } else {
      const completed = allWorkouts.filter((w) => w.completed).length
      const byType: Record<string, { total: number; done: number }> = {}
      allWorkouts.forEach((w) => {
        const t = w.type || 'other'
        if (!byType[t]) byType[t] = { total: 0, done: 0 }
        byType[t].total++
        if (w.completed) byType[t].done++
      })
      ctx += `Completed: ${completed}/${allWorkouts.length} (${Math.round(completed / allWorkouts.length * 100)}%)\n`
      Object.entries(byType).forEach(([type, c]) => {
        ctx += `- ${type}: ${c.done}/${c.total}\n`
      })
    }

    // Physio
    if (physioLogs.length > 0) {
      ctx += `\nPHYSIO SESSIONS (${physioLogs.length}):\n`
      physioLogs.forEach((pl: any) => {
        ctx += `- ${pl.plan_title} (${pl.plan_type})`
        if (pl.pain_level != null) ctx += ` — pain: ${pl.pain_level}/10`
        if (pl.notes) ctx += ` — "${pl.notes}"`
        ctx += '\n'
      })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1200,
      system: `You write concise, honest weekly reviews for student-athletes. You analyze their actual data and give specific, actionable advice for the coming week.

Your review has exactly these sections:

1. **overview**: 2-3 sentences summarizing the week — what went well, what didn't. Reference specific numbers.

2. **wins**: Array of 2-3 specific things they did well (e.g., "Hit protein goal 5 of 7 days", "Completed all assigned lifts"). Only include if the data supports it.

3. **concerns**: Array of 1-3 areas needing attention. Be direct but compassionate. If mental scores were low, acknowledge it gently and suggest self-care. If under-eating, give a specific calorie target. If soreness is recurring, name the body part and suggest action.

4. **next_week**: Array of 3-4 specific, actionable recommendations for next week. Each must reference their actual data (e.g., "Increase daily protein by 25g — you averaged 120g vs your 150g goal. Add a protein shake after practice.", "Your hamstrings were sore 4 times — add 10 min foam rolling after every session").

5. **mood_check**: If mental wellness averaged below 5, include a supportive message. Otherwise null.

Output ONLY valid JSON:
{
  "review": {
    "overview": "...",
    "wins": ["...", "..."],
    "concerns": ["...", "..."],
    "next_week": ["...", "...", "..."],
    "mood_check": "..." or null
  }
}`,
      messages: [{ role: 'user', content: `Analyze this athlete's week and create their review:\n\n${ctx}` }],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response' }, { status: 500 })
    }

    let review
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error()
      review = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Failed to parse review' }, { status: 500 })
    }

    // Cache with a special key (reuse weekly_plan_cache with week_start = last monday)
    // Use a wrapper so GET can distinguish it from weekly plans
    const wrapped = { review: review.review || review }
    await sql`
      INSERT INTO weekly_plan_cache (user_id, week_start, plan_json)
      VALUES (${user.id}, ${lastSunday}, ${JSON.stringify(wrapped)})
      ON CONFLICT (user_id, week_start) DO UPDATE SET
        plan_json = ${JSON.stringify(wrapped)},
        generated_at = NOW()
    `

    return NextResponse.json({ review: wrapped, generatedAt: new Date().toISOString(), cached: false })
  } catch (error) {
    console.error('Generate week review error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to generate review'
    return NextResponse.json({ error: msg.includes('does not exist') ? 'Database table missing. Run migration 023.' : msg }, { status: 500 })
  }
}

function getLastSunday(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  // Last week's Sunday
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day - 7)
  return sunday.toISOString().split('T')[0]
}
