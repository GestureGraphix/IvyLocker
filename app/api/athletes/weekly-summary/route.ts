import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/weekly-summary?weekStart=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    let weekStart = searchParams.get('weekStart')

    // Default to current week (Monday)
    if (!weekStart) {
      const today = new Date()
      const day = today.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const monday = new Date(today)
      monday.setDate(today.getDate() + diff)
      weekStart = monday.toISOString().split('T')[0]
    }

    const weekEnd = new Date(weekStart + 'T00:00:00')
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Run all queries in parallel
    const [goals, checkins, nutrition, hydration, sessions, workouts, physioLogs] = await Promise.all([
      // 1. Goals
      sql`
        SELECT calorie_goal, protein_goal_grams, hydration_goal_oz
        FROM athlete_profiles WHERE user_id = ${user.id}
      `,

      // 2. Check-ins (mental, physical, soreness)
      sql`
        SELECT date, mental_state, physical_state, soreness_areas
        FROM check_in_logs
        WHERE user_id = ${user.id} AND date >= ${weekStart} AND date < ${weekEndStr}
        ORDER BY date
      `,

      // 3. Nutrition (per day totals)
      sql`
        SELECT
          date_time::date as day,
          SUM(calories)::int as total_calories,
          SUM(protein_grams)::numeric as total_protein,
          SUM(carbs_grams)::numeric as total_carbs,
          SUM(fat_grams)::numeric as total_fat
        FROM meal_logs
        WHERE user_id = ${user.id} AND date_time >= ${weekStart} AND date_time < ${weekEndStr}
        GROUP BY date_time::date
        ORDER BY day
      `,

      // 4. Hydration (per day totals)
      sql`
        SELECT date as day, SUM(ounces)::int as total_oz
        FROM hydration_logs
        WHERE user_id = ${user.id} AND date >= ${weekStart} AND date < ${weekEndStr}
        GROUP BY date
        ORDER BY date
      `,

      // 5. Self-created sessions
      sql`
        SELECT type, completed, title
        FROM sessions
        WHERE user_id = ${user.id}
          AND (start_at >= ${weekStart} OR scheduled_date >= ${weekStart})
          AND (start_at < ${weekEndStr} OR scheduled_date < ${weekEndStr})
      `,

      // 6. Coach-assigned workouts
      sql`
        SELECT
          aw.completed,
          ps.session_type
        FROM assigned_workouts aw
        JOIN plan_sessions ps ON ps.id = aw.plan_session_id
        WHERE aw.athlete_id = ${user.id}
          AND aw.workout_date >= ${weekStart} AND aw.workout_date < ${weekEndStr}
      `,

      // 7. Physio logs
      sql`
        SELECT pl.logged_date, pl.pain_level, pa.type as plan_type
        FROM physio_plan_logs pl
        JOIN physio_assignments pa ON pa.id = pl.assignment_id
        WHERE pl.athlete_id = ${user.id}
          AND pl.logged_date >= ${weekStart} AND pl.logged_date < ${weekEndStr}
      `,
    ])

    // Process goals
    const g = goals[0] || { calorie_goal: 2500, protein_goal_grams: 150, hydration_goal_oz: 100 }

    // Process check-ins
    const mentalScores = checkins.map((c: any) => c.mental_state).filter(Boolean)
    const physicalScores = checkins.map((c: any) => c.physical_state).filter(Boolean)
    const allSoreness: string[] = []
    checkins.forEach((c: any) => {
      if (c.soreness_areas && Array.isArray(c.soreness_areas)) {
        allSoreness.push(...c.soreness_areas)
      }
    })
    // Count soreness occurrences
    const sorenessCount: Record<string, number> = {}
    allSoreness.forEach((area) => {
      sorenessCount[area] = (sorenessCount[area] || 0) + 1
    })
    const topSoreness = Object.entries(sorenessCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([area, count]) => ({ area, count }))

    // Process nutrition
    const daysWithMeals = nutrition.length
    const totalCalories = nutrition.reduce((s: number, d: any) => s + (d.total_calories || 0), 0)
    const totalProtein = nutrition.reduce((s: number, d: any) => s + Number(d.total_protein || 0), 0)
    const totalCarbs = nutrition.reduce((s: number, d: any) => s + Number(d.total_carbs || 0), 0)
    const totalFat = nutrition.reduce((s: number, d: any) => s + Number(d.total_fat || 0), 0)
    const avgCalories = daysWithMeals > 0 ? Math.round(totalCalories / daysWithMeals) : 0
    const avgProtein = daysWithMeals > 0 ? Math.round(totalProtein / daysWithMeals) : 0
    const avgCarbs = daysWithMeals > 0 ? Math.round(totalCarbs / daysWithMeals) : 0
    const avgFat = daysWithMeals > 0 ? Math.round(totalFat / daysWithMeals) : 0

    // Process hydration
    const daysWithHydration = hydration.length
    const totalOz = hydration.reduce((s: number, d: any) => s + (d.total_oz || 0), 0)
    const avgOz = daysWithHydration > 0 ? Math.round(totalOz / daysWithHydration) : 0

    // Process workouts (sessions + assigned)
    const sessionsByType: Record<string, { total: number; completed: number }> = {}
    sessions.forEach((s: any) => {
      const type = s.type || 'other'
      if (!sessionsByType[type]) sessionsByType[type] = { total: 0, completed: 0 }
      sessionsByType[type].total++
      if (s.completed) sessionsByType[type].completed++
    })
    workouts.forEach((w: any) => {
      const type = w.session_type || 'practice'
      if (!sessionsByType[type]) sessionsByType[type] = { total: 0, completed: 0 }
      sessionsByType[type].total++
      if (w.completed) sessionsByType[type].completed++
    })

    // Process physio
    const physioCount = physioLogs.length
    const physioByType: Record<string, number> = {}
    physioLogs.forEach((p: any) => {
      physioByType[p.plan_type] = (physioByType[p.plan_type] || 0) + 1
    })

    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null

    return NextResponse.json({
      weekStart,
      weekEnd: weekEndStr,
      checkedInDays: checkins.length,
      wellness: {
        mentalAvg: avg(mentalScores),
        physicalAvg: avg(physicalScores),
        checkInDays: checkins.length,
        soreness: topSoreness,
      },
      nutrition: {
        daysTracked: daysWithMeals,
        avgCalories,
        avgProtein,
        avgCarbs,
        avgFat,
        calorieGoal: g.calorie_goal,
        proteinGoal: g.protein_goal_grams,
        calorieGap: avgCalories - g.calorie_goal,
        proteinGap: avgProtein - g.protein_goal_grams,
      },
      hydration: {
        daysTracked: daysWithHydration,
        avgOz,
        goal: g.hydration_goal_oz,
        gap: avgOz - g.hydration_goal_oz,
      },
      workouts: {
        byType: sessionsByType,
        totalAssigned: Object.values(sessionsByType).reduce((s, t) => s + t.total, 0),
        totalCompleted: Object.values(sessionsByType).reduce((s, t) => s + t.completed, 0),
      },
      physio: {
        sessionsLogged: physioCount,
        byType: physioByType,
      },
    })
  } catch (error) {
    console.error('Weekly summary error:', error)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
