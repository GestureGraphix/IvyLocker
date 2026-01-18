import { sql } from '@/lib/db'

export interface AthleteContext {
  profile: {
    name: string
    sport: string | null
    position: string | null
    level: string | null
    height_cm: number | null
    weight_kg: number | null
    calorie_goal: number
    protein_goal_grams: number
    hydration_goal_oz: number
  }
  todaySessions: Array<{
    type: string
    title: string
    start_at: string
    end_at: string | null
    intensity: string | null
    focus: string | null
  }>
  recentCheckIns: Array<{
    date: string
    mental_state: number | null
    physical_state: number | null
  }>
  todayNutrition: {
    total_calories: number
    total_protein: number
    total_carbs: number
    meals_logged: number
  }
  todayHydration: {
    total_ounces: number
  }
  upcomingAcademics: Array<{
    type: string
    title: string
    due_date: string
    priority: string
    course_name: string | null
  }>
}

export async function gatherAthleteData(userId: string): Promise<AthleteContext> {
  const today = new Date().toISOString().split('T')[0]
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch all data in parallel
  const [
    profileResult,
    sessionsResult,
    checkInsResult,
    mealsResult,
    hydrationResult,
    academicsResult,
  ] = await Promise.all([
    // Profile with user name
    sql`
      SELECT
        u.name,
        ap.sport,
        ap.position,
        ap.level,
        ap.height_cm,
        ap.weight_kg,
        COALESCE(ap.calorie_goal, 2500) as calorie_goal,
        COALESCE(ap.protein_goal_grams, 150) as protein_goal_grams,
        COALESCE(ap.hydration_goal_oz, 100) as hydration_goal_oz
      FROM users u
      LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
      WHERE u.id = ${userId}
    `,

    // Today's sessions
    sql`
      SELECT type, title, start_at, end_at, intensity, focus
      FROM sessions
      WHERE user_id = ${userId}
        AND DATE(start_at) = ${today}
      ORDER BY start_at
    `,

    // Recent check-ins (last 3 days)
    sql`
      SELECT date, mental_state, physical_state
      FROM check_in_logs
      WHERE user_id = ${userId}
        AND date >= ${threeDaysAgo}
      ORDER BY date DESC
      LIMIT 3
    `,

    // Today's meals aggregate
    sql`
      SELECT
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein_grams), 0) as total_protein,
        COALESCE(SUM(carbs_grams), 0) as total_carbs,
        COUNT(*) as meals_logged
      FROM meal_logs
      WHERE user_id = ${userId}
        AND DATE(date_time) = ${today}
    `,

    // Today's hydration
    sql`
      SELECT COALESCE(SUM(ounces), 0) as total_ounces
      FROM hydration_logs
      WHERE user_id = ${userId}
        AND date = ${today}
    `,

    // Upcoming academics (next 3 days)
    sql`
      SELECT
        ai.type,
        ai.title,
        ai.due_date,
        ai.priority,
        c.name as course_name
      FROM academic_items ai
      LEFT JOIN courses c ON c.id = ai.course_id
      WHERE ai.user_id = ${userId}
        AND ai.completed = false
        AND DATE(ai.due_date) <= ${threeDaysFromNow}
      ORDER BY ai.due_date
      LIMIT 5
    `,
  ])

  const profile = profileResult[0] || {
    name: 'Athlete',
    sport: null,
    position: null,
    level: null,
    height_cm: null,
    weight_kg: null,
    calorie_goal: 2500,
    protein_goal_grams: 150,
    hydration_goal_oz: 100,
  }

  const todayNutrition = mealsResult[0] || {
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    meals_logged: 0,
  }

  const todayHydration = hydrationResult[0] || { total_ounces: 0 }

  return {
    profile: {
      name: profile.name,
      sport: profile.sport,
      position: profile.position,
      level: profile.level,
      height_cm: profile.height_cm ? Number(profile.height_cm) : null,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
      calorie_goal: Number(profile.calorie_goal),
      protein_goal_grams: Number(profile.protein_goal_grams),
      hydration_goal_oz: Number(profile.hydration_goal_oz),
    },
    todaySessions: sessionsResult.map((s: any) => ({
      type: s.type,
      title: s.title,
      start_at: s.start_at,
      end_at: s.end_at,
      intensity: s.intensity,
      focus: s.focus,
    })),
    recentCheckIns: checkInsResult.map((c: any) => ({
      date: c.date,
      mental_state: c.mental_state,
      physical_state: c.physical_state,
    })),
    todayNutrition: {
      total_calories: Number(todayNutrition.total_calories),
      total_protein: Number(todayNutrition.total_protein),
      total_carbs: Number(todayNutrition.total_carbs),
      meals_logged: Number(todayNutrition.meals_logged),
    },
    todayHydration: {
      total_ounces: Number(todayHydration.total_ounces),
    },
    upcomingAcademics: academicsResult.map((a: any) => ({
      type: a.type,
      title: a.title,
      due_date: a.due_date,
      priority: a.priority,
      course_name: a.course_name,
    })),
  }
}

export function formatAthleteDataForPrompt(data: AthleteContext): string {
  const { profile, todaySessions, recentCheckIns, todayNutrition, todayHydration, upcomingAcademics } = data

  let prompt = `ATHLETE CONTEXT:
- Name: ${profile.name}
- Sport: ${profile.sport || 'Not specified'}
- Position: ${profile.position || 'Not specified'}
- Level: ${profile.level || 'Not specified'}
- Daily Goals: ${profile.calorie_goal} calories, ${profile.protein_goal_grams}g protein, ${profile.hydration_goal_oz}oz water
`

  // Today's training
  prompt += `\nTODAY'S TRAINING:\n`
  if (todaySessions.length === 0) {
    prompt += `- No training scheduled today (rest day or schedule not entered)\n`
  } else {
    todaySessions.forEach((s) => {
      const time = new Date(s.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      prompt += `- ${time}: ${s.title} (${s.type}, ${s.intensity || 'moderate'} intensity${s.focus ? `, focus: ${s.focus}` : ''})\n`
    })
  }

  // Recent wellness
  prompt += `\nRECENT WELLNESS (last 3 days):\n`
  if (recentCheckIns.length === 0) {
    prompt += `- No check-in data available\n`
  } else {
    recentCheckIns.forEach((c) => {
      prompt += `- ${c.date}: Mental ${c.mental_state || '?'}/10, Physical ${c.physical_state || '?'}/10\n`
    })
  }

  // Nutrition today
  prompt += `\nNUTRITION TODAY (so far):\n`
  prompt += `- Meals logged: ${todayNutrition.meals_logged}\n`
  prompt += `- Calories: ${todayNutrition.total_calories} / ${profile.calorie_goal} goal\n`
  prompt += `- Protein: ${todayNutrition.total_protein}g / ${profile.protein_goal_grams}g goal\n`
  prompt += `- Carbs: ${todayNutrition.total_carbs}g\n`

  // Hydration
  prompt += `\nHYDRATION TODAY:\n`
  prompt += `- ${todayHydration.total_ounces}oz / ${profile.hydration_goal_oz}oz goal\n`

  // Academics
  prompt += `\nUPCOMING ACADEMIC DEADLINES:\n`
  if (upcomingAcademics.length === 0) {
    prompt += `- No upcoming deadlines in the next 3 days\n`
  } else {
    upcomingAcademics.forEach((a) => {
      const due = new Date(a.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      prompt += `- ${due}: ${a.title} (${a.type}, ${a.priority} priority${a.course_name ? `, ${a.course_name}` : ''})\n`
    })
  }

  return prompt
}
