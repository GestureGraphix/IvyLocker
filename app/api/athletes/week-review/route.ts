import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

// GET /api/athletes/week-review
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const lastSunday = getLastSunday(searchParams.get('localDate'))
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
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const lastSunday = getLastSunday(searchParams.get('localDate'))
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
    ctx += `\nPHYSIO:\n`
    if (physioLogs.length === 0) {
      ctx += `No physio sessions logged.\n`
    } else {
      physioLogs.forEach((pl: any) => {
        ctx += `- ${pl.plan_title} (${pl.plan_type})`
        if (pl.pain_level != null) ctx += ` — pain: ${pl.pain_level}/10`
        if (pl.notes) ctx += ` — "${pl.notes}"`
        ctx += '\n'
      })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `You are an elite sports performance coach writing a weekly review for a student-athlete. Use ONLY the data provided — never invent classes, workouts, meals, or any information not explicitly listed.

STRICT RULES:
- Only reference data that exists. If no nutrition was tracked, say "No meals were logged this week" — don't invent numbers.
- If no check-ins exist, say so. Don't assume wellness scores.
- If no classes/academics are listed, don't mention academic performance.
- Reference exact numbers from the data (e.g., "You averaged 1,800 calories vs your 2,500 goal").
- Workouts: only count what the data shows as completed. Don't assume completion.

YOUR REVIEW MUST INCLUDE:

1. **overview**: 3-4 sentences. Honest assessment of the week. What patterns do you see? Reference specific numbers. If data is sparse, acknowledge that tracking more would help.

2. **wins**: Array of things they did well — ONLY if supported by data. If they have no data, this can be an empty array. Examples: "Checked in 5 of 7 days — great consistency", "Hydration averaged 95oz, close to your 100oz goal."

3. **concerns**: Array of areas needing attention. Be specific and actionable:
   - Under-eating: "You averaged X cal/day vs your Y goal. That's a Z cal deficit. Try adding a post-training snack — a protein shake + banana adds ~400 cal and 30g protein."
   - Soreness: "Your [body part] was sore X times. Add 10 minutes of targeted foam rolling after each session, focusing on [specific area]."
   - Low physical state: "Physical scores dipped to X on [days]. Consider lighter recovery sessions the day after intense training."
   - Dehydration: "Hydration averaged Xoz vs your Yoz goal. Keep a water bottle during class and set hourly reminders."
   - If no concerning data, this can be empty.

4. **nutrition_focus**: 2-3 sentences of specific nutritional advice for next week based on their gaps. What foods to add, when to eat them, how to close calorie/protein gaps. Example: "You're consistently 30g short on protein. Add Greek yogurt (15g) at breakfast and a protein shake (25g) post-training. For dinner, prioritize chicken, fish, or beans over lighter options." If no nutrition data, say "Start logging meals to get personalized nutrition advice."

5. **recovery_focus**: 2-3 sentences about recovery priorities. Based on soreness patterns, training load, and physical scores. What specific mobility work, when to foam roll, sleep adjustments. If no data, give general advice based on their sport.

6. **next_week**: Array of 3-5 specific, numbered action items for the coming week. Each should be one concrete thing they can do. Not vague — include quantities, timing, specific foods or exercises.

7. **mood_check**: If mental wellness averaged below 5, include a supportive 2-3 sentence message. Acknowledge the difficulty without being preachy. Suggest one specific self-care action. If scores are fine or no data, set to null.

Output ONLY valid JSON:
{
  "review": {
    "overview": "...",
    "wins": ["...", "..."],
    "concerns": ["...", "..."],
    "nutrition_focus": "...",
    "recovery_focus": "...",
    "next_week": ["1. ...", "2. ...", "3. ..."],
    "mood_check": "..." or null
  }
}`,
      messages: [{ role: 'user', content: `Analyze this athlete's week and write their performance review:\n\n${ctx}` }],
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

function getLastSunday(localDate?: string | null): string {
  const today = localDate ? new Date(localDate + 'T12:00:00') : new Date()
  const day = today.getDay() // 0=Sun
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day - 7)
  return sunday.toISOString().split('T')[0]
}
