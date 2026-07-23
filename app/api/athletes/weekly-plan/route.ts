import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { fetchYaleMenuForWeek, type DiningMeal } from '@/lib/ai/gather-athlete-data'

// GET /api/athletes/weekly-plan?localDate=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const weekStart = getSunday(searchParams.get('localDate'))
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
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.AWS_ACCESS_KEY_ID) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const weekStart = getSunday(searchParams.get('localDate'))
    const weekEnd = new Date(weekStart + 'T00:00:00')
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Pull ALL relevant data in parallel
    const [profile, workouts, selfSessions, courses, academics, checkins, physioPlans, lastWeekNutrition, lastWeekHydration, athleteDayIntensities] = await Promise.all([
      // Profile + goals
      sql`
        SELECT u.name, ap.sport, ap.position, ap.team, ap.university,
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
      // Self-created sessions
      sql`
        SELECT type, title, start_at, intensity, focus, scheduled_date, completed
        FROM sessions
        WHERE user_id = ${user.id}
          AND (
            (start_at >= ${weekStart} AND start_at < ${weekEndStr})
            OR (scheduled_date >= ${weekStart} AND scheduled_date < ${weekEndStr})
          )
        ORDER BY start_at
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
      // Athlete's own per-day intensity markers for this week (WeekIntensityCard grid).
      // Guarded so a missing table (unrun migration 027) can't break generation.
      sql`
        SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, intensity
        FROM athlete_day_intensity
        WHERE athlete_id = ${user.id}
          AND date >= ${weekStart}::date AND date < ${weekEndStr}::date
        ORDER BY date
      `.catch(() => [] as any[]),
    ])

    const p = profile[0] || {}
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

    // The 7 dates of this week (weekStart is Sunday) — reused by the schedule
    // loop, the intensity resolver, and the dining-menu section.
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T12:00:00')
      d.setDate(d.getDate() + i)
      weekDates.push(d.toISOString().split('T')[0])
    }

    // Athlete's own per-day intensity, keyed by date. Used only when the coach
    // hasn't set an intensity for that day (coach always wins).
    const athleteIntensityByDate: Record<string, string> = {}
    for (const r of (athleteDayIntensities as any[]) || []) {
      if (r?.date && r?.intensity) athleteIntensityByDate[r.date] = r.intensity
    }

    // Pull the real Yale dining menus for the week so food recs name actual
    // dishes. Scoped to Yale athletes for now (the Nutrislice source is Yale-only).
    // Best-effort: a failure or timeout falls back to generic food guidance.
    const isYale = String(p.university || '').toLowerCase().includes('yale')
    let weekMenus: Record<string, DiningMeal[]> = {}
    if (isYale) {
      try {
        weekMenus = await fetchYaleMenuForWeek(weekDates)
      } catch (err) {
        console.error('Weekly plan: Yale menu fetch failed, using generic food guidance', err)
      }
    }

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

    // Helper to extract intensity level from either string or {level, time} object
    const getIntensityLevel = (val: any): string | null => {
      if (!val) return null
      if (typeof val === 'string') return val
      if (typeof val === 'object' && val.level) return val.level
      return null
    }

    // Neon may return date columns as JS Date objects; normalize to "YYYY-MM-DD"
    const toDateStr = (val: any): string => {
      if (!val) return ''
      if (val instanceof Date) return val.toISOString().split('T')[0]
      const s = String(val)
      // Already ISO format "2026-04-06" or "2026-04-06T..."
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
      // Fallback: parse and re-format
      const d = new Date(s)
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
    }

    // Coach's plan-level per-weekday intensity (shared across the week's plan).
    const coachDayIntensities: Record<string, any> =
      (workouts as any[]).find((w: any) => w.day_intensities)?.day_intensities || {}

    // This week's workouts by day
    ctx += `\n=== THIS WEEK'S TRAINING SCHEDULE ===\n`
    ctx += `(Week: ${weekStart} to ${weekEndStr}, ${(workouts as any[]).length} assigned workouts found, ${(selfSessions as any[]).length} self sessions)\n`
    for (let i = 0; i < 7; i++) {
      const dateStr = weekDates[i]
      const d = new Date(dateStr + 'T12:00:00')
      const dayName = dayNames[d.getDay()]
      const dayKey = dayKeys[d.getDay()]

      const dayWorkouts = (workouts as any[]).filter((w: any) => toDateStr(w.workout_date) === dateStr)
      const daySessions = (selfSessions as any[]).filter((s: any) => {
        const sDate = toDateStr(s.scheduled_date || s.start_at)
        return sDate === dateStr
      })

      // Resolve the day's intensity: the coach's plan-level intensity wins; the
      // athlete's own per-day marker fills in when the coach hasn't set one.
      const coachLevel = getIntensityLevel(coachDayIntensities[dayKey])
      const athleteLevel = athleteIntensityByDate[dateStr] || null
      const effectiveIntensity = (coachLevel && coachLevel !== 'n/a') ? coachLevel : athleteLevel
      const intensitySource = (coachLevel && coachLevel !== 'n/a') ? 'coach' : (athleteLevel ? 'athlete' : null)

      if (dayWorkouts.length === 0 && daySessions.length === 0) {
        if (effectiveIntensity && effectiveIntensity !== 'n/a' && effectiveIntensity !== 'rest') {
          const cap = effectiveIntensity.charAt(0).toUpperCase() + effectiveIntensity.slice(1)
          ctx += `${dayName}: ${cap} intensity day (no specific workout assigned, ${intensitySource}-set) [DAY INTENSITY: ${effectiveIntensity}]\n`
        } else if (effectiveIntensity === 'rest') {
          ctx += `${dayName}: Rest day (${intensitySource}-set) [DAY INTENSITY: rest]\n`
        } else {
          ctx += `${dayName}: Rest day [DAY INTENSITY: rest]\n`
        }
      } else {
        const parts = dayWorkouts.map((w: any) => {
          let s = `${w.title || w.session_type}`
          if (w.start_time) s += ` at ${w.start_time}`
          if (w.location) s += ` (${w.location})`
          const intensityData = w.day_intensities?.[dayKey]
          const level = getIntensityLevel(intensityData)
          if (level && level !== 'n/a') {
            s += ` [${level} intensity]`
          }
          const exList = Array.isArray(w.exercises) ? w.exercises : []
          if (exList.length > 0 && exList[0]?.name) {
            s += ` — ${exList.slice(0, 4).map((e: any) => e.name).join(', ')}`
            if (exList.length > 4) s += `... (+${exList.length - 4} more)`
          }
          return s
        })
        const selfParts = daySessions.map((s: any) => {
          let str = `${s.title || s.type}`
          if (s.intensity) str += ` [${s.intensity}]`
          if (s.focus) str += ` (${s.focus})`
          return str
        })
        const intensityTag = (effectiveIntensity && effectiveIntensity !== 'n/a')
          ? ` [DAY INTENSITY: ${effectiveIntensity}${intensitySource ? `, ${intensitySource}-set` : ''}]`
          : ''
        ctx += `${dayName}: ${[...parts, ...selfParts].join(' | ')}${intensityTag}\n`
      }
    }

    // This week's real dining-hall menus (Yale) — the source of truth for the "food" field.
    ctx += `\n=== YALE DINING MENUS ===\n`
    const menuDates = Object.keys(weekMenus)
    if (!isYale) {
      ctx += `Athlete is not at Yale — no dining menu available. Use general sports-nutrition food guidance.\n`
    } else if (menuDates.length === 0) {
      ctx += `No dining menu published for this week — use general sports-nutrition food guidance.\n`
    } else {
      ctx += `(Real Branford College menu. Recommend specific dishes BY NAME from the matching day + meal below. Format per item: Name (cal / protein g / carbs g).)\n`
      for (let i = 0; i < 7; i++) {
        const dateStr = weekDates[i]
        const meals = weekMenus[dateStr]
        if (!meals || meals.length === 0) continue
        const d = new Date(dateStr + 'T12:00:00')
        ctx += `${dayNames[d.getDay()]} ${dateStr}:\n`
        for (const meal of meals) {
          const items = meal.items.slice(0, 16)
          ctx += `  ${meal.mealType.toUpperCase()}: ${items.map((it) => `${it.name} (${it.calories}cal, ${it.proteinG}P, ${it.carbsG}C)`).join('; ')}\n`
        }
      }
    }

    // Course schedule
    ctx += `\n=== CLASS SCHEDULE ===\n`
    if (courses.length === 0) {
      ctx += `NO CLASSES REGISTERED. Do not mention any classes or coursework.\n`
    } else {
      courses.forEach((c: any) => {
        ctx += `- ${c.code || c.name}: ${c.schedule || 'No schedule'}${c.meeting_days?.length ? ` (${c.meeting_days.join('/')})` : ''}\n`
      })
    }

    // Academic deadlines
    ctx += `\n=== DEADLINES THIS WEEK ===\n`
    if (academics.length === 0) {
      ctx += `NO DEADLINES THIS WEEK. Do not mention any assignments, exams, or academic work.\n`
    } else {
      academics.forEach((a: any) => {
        const d = new Date(String(a.due_date || '').slice(0, 10) + 'T12:00:00')
        ctx += `- ${dayNames[d.getDay()]}: ${a.title} (${a.type}${a.priority ? `, ${a.priority} priority` : ''})${a.course_code ? ` — ${a.course_code}` : ''}\n`
      })
    }

    // Physio protocols
    ctx += `\n=== PHYSIO PROTOCOLS ===\n`
    if (physioPlans.length === 0) {
      ctx += `No active physio protocols.\n`
    } else {
      ctx += `\n=== ACTIVE PHYSIO PROTOCOLS ===\n`
      physioPlans.forEach((pp: any) => {
        ctx += `- ${pp.title} (${pp.type}) from ${pp.physio_name}${pp.frequency ? ` — ${pp.frequency}` : ''}\n`
        if (pp.description) {
          // Include first 200 chars of the plan
          ctx += `  Protocol: ${pp.description.slice(0, 200)}${pp.description.length > 200 ? '...' : ''}\n`
        }
      })
    }

    const bedrock = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    const planBody = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      system: `You are an elite sports performance coach creating a detailed weekly plan for a student-athlete. Use ONLY the data provided — never invent classes, assignments, workouts, or any data not explicitly listed.

YOUR EXPERTISE: Sports nutrition timing, sleep science for athletes, periodization, recovery protocols.

STRICT DATA RULES:
- If NO CLASSES are listed, the "study" field must say "No classes registered" — never invent courses.
- If NO DEADLINES are listed, do not mention academic work.
- If a day has a workout in the TRAINING SCHEDULE → it is a training day. Match the exact intensity.
- If a day has NO workout → it is a rest day.
- Workouts are SCHEDULED, not completed. Don't say "after you complete" — say "before/after your session."
- INTENSITY IS THE SPINE OF THE PLAN. Every day line ends with [DAY INTENSITY: level]. That level is the single source of truth for the day's load — set the "intensity" output field to exactly that value, and tune food (carb volume/timing), sleep (bedtime + hours), and mobility (volume) to it. Higher intensity → more carbs and earlier/longer sleep the night before; rest/low → lighter carbs, longer mobility.
- The YALE DINING MENUS section lists the REAL dining-hall menu per day. On a day that has a menu, the "food" bullets MUST name specific dishes from THAT day's listed meals — never invent foods when a menu is given for that day. Only use generic food guidance for days/meals with no menu listed.

FOOD GUIDANCE (be specific, not "eat X calories"):
- Night before a high-intensity day: Complex carbs for glycogen loading — pasta, rice, sweet potato. Moderate protein. Example: "Dinner: grilled chicken with brown rice and roasted vegetables. Aim for a carb-heavy plate."
- Breakfast before training: Easily digestible carbs + moderate protein 2-3hrs before. Example: "Oatmeal with banana and peanut butter, or eggs with toast."
- Pre-training snack (1hr before): Light, fast-digesting. "Banana, granola bar, or handful of pretzels."
- Post-training (within 30min): Protein + carbs for recovery. "Chocolate milk, protein shake with banana, or Greek yogurt with granola."
- Lunch on training days: Balanced plate — protein source, complex carb, vegetables.
- Rest day food: Slightly lower carbs, maintain protein. Focus on anti-inflammatory foods if sore.
- These patterns describe WHAT to pick. When a Yale dining menu is listed for the day, pick the ACTUAL menu dishes that best fit the pattern and the day's intensity (e.g. the highest-carb entrée the night before a high day; a high-protein option post-training). Name the real dish, then apply the meal label and timing.

SLEEP GUIDANCE (be specific with times):
- Night before high-intensity: "In bed by 10pm, aim for 8-9 hours. No screens after 9:30pm."
- Night before medium-intensity: "In bed by 10:30pm, 7-8 hours."
- Night before rest day or low-intensity: "Flexible — good night to stay up slightly later for studying if needed. Still aim for 7+ hours."
- After high-intensity day: "Prioritize sleep tonight for recovery. In bed by 10pm."
- Consider next day: If tomorrow is heavy, tonight's sleep matters more.

MOBILITY GUIDANCE:
- High-intensity training days: "15min dynamic warmup before, 10min static stretching + foam roll after. Focus on [relevant muscle groups for their sport]."
- Medium days: "10min mobility work post-session."
- Rest days: "20-30min extended mobility session — foam roll, hip openers, thoracic spine work."
- If soreness data exists: Target those specific areas.
- If physio protocol exists: Reference it by name.

STUDY GUIDANCE:
- Only if classes/deadlines exist in the data.
- Rest days and low-intensity days = best study blocks.
- "No classes registered" if no class data exists.

WRITING STYLE — CRITICAL: This renders as compact expandable cards on a phone. Each domain field is an ARRAY of short, SPECIFIC bullet points — never a paragraph, and never vague. Keep every concrete detail: exact foods, meal labels, clock times, ounces, sets/reps, exercise names, muscle groups. Each bullet is ONE idea, max ~14 words, no filler reasoning. Specificity is the entire value — write "Dinner: spaghetti with lean turkey meat sauce, garlic bread, side salad", NOT "eat a carb-heavy dinner". Break what used to be a paragraph into 2-5 crisp bullets.

OUTPUT FORMAT:
- "summary": 3-5 word gist of the day (e.g. "Pre-game carb load", "Full rest day", "Heavy lift + recovery").
- "intensity": one of "rest" | "low" | "medium" | "high" — MUST equal the [DAY INTENSITY: ...] value shown on that day's schedule line.
- "food": array of bullets — label the meals (Breakfast/Lunch/Dinner/Snack). When a dining menu is listed for the day, the items MUST be real dishes from that day's menu, chosen to fit the day's intensity. Include a hydration bullet.
- "sleep": array of bullets — bed time + target hours, plus wind-down specifics (e.g. "No screens after 9:30pm").
- "mobility": array of bullets — specific drills/areas with durations (e.g. "10min foam roll: quads, hamstrings, IT band").
- "study": array of bullets tied to real deadlines/classes, or exactly ["No classes registered"] if no class data exists.

{
  "days": {
    "sunday": { "summary": "...", "intensity": "...", "food": ["...", "..."], "sleep": ["...", "..."], "mobility": ["..."], "study": ["..."] },
    "monday": { ... }, "tuesday": { ... }, "wednesday": { ... },
    "thursday": { ... }, "friday": { ... }, "saturday": { ... }
  }
}

Output ONLY valid JSON.`,
      messages: [{ role: 'user', content: `Create a detailed weekly performance plan using this athlete's data:\n\n${ctx}` }],
    })

    const planResponse = await bedrock.send(new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: planBody,
    }))

    const planResult = JSON.parse(new TextDecoder().decode(planResponse.body))
    const planText = planResult.content?.[0]?.text

    if (!planText) {
      return NextResponse.json({ error: 'No response' }, { status: 500 })
    }

    let plan
    try {
      const jsonMatch = planText.match(/\{[\s\S]*\}/)
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

function getSunday(localDate?: string | null): string {
  // Use client's local date if provided, otherwise best-effort server date
  const today = localDate ? new Date(localDate + 'T12:00:00') : new Date()
  const day = today.getDay() // 0=Sun
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day)
  return sunday.toISOString().split('T')[0]
}
