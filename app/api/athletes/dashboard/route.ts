import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]
    const startOfDay = `${today}T00:00:00Z`
    const endOfDay = `${today}T23:59:59Z`

    // Get today's hydration total
    const hydrationResult = await sql`
      SELECT COALESCE(SUM(ounces), 0) as total
      FROM hydration_logs
      WHERE user_id = ${user.id}
        AND date = ${today}
    `

    // Get hydration goal from profile
    const profileResult = await sql`
      SELECT hydration_goal_oz, calorie_goal, protein_goal_grams
      FROM athlete_profiles
      WHERE user_id = ${user.id}
    `

    // Get today's meals
    const mealsResult = await sql`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(calories), 0) as calories,
        COALESCE(SUM(protein_grams), 0) as protein,
        COALESCE(SUM(carbs_grams), 0) as carbs,
        COALESCE(SUM(fat_grams), 0) as fat
      FROM meal_logs
      WHERE user_id = ${user.id}
        AND date_time >= ${startOfDay}
        AND date_time <= ${endOfDay}
    `

    // Get today's sessions
    const sessionsResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
      FROM sessions
      WHERE user_id = ${user.id}
        AND DATE(start_at) = ${today}
    `

    // Get today's check-in for wellness score
    const checkInResult = await sql`
      SELECT mental_state, physical_state
      FROM check_in_logs
      WHERE user_id = ${user.id}
        AND date = ${today}
    `

    // Get upcoming sessions for today
    const upcomingSessions = await sql`
      SELECT id, title, type, start_at, intensity
      FROM sessions
      WHERE user_id = ${user.id}
        AND DATE(start_at) = ${today}
        AND completed = false
      ORDER BY start_at ASC
      LIMIT 5
    `

    // Get upcoming academic deadlines (next 7 days)
    const upcomingAcademics = await sql`
      SELECT ai.id, ai.title, ai.due_date, ai.priority, c.code as course_code
      FROM academic_items ai
      LEFT JOIN courses c ON ai.course_id = c.id
      WHERE ai.user_id = ${user.id}
        AND ai.completed = false
        AND ai.due_date >= ${today}
        AND ai.due_date <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY ai.due_date ASC
      LIMIT 5
    `

    const profile = profileResult[0] || { hydration_goal_oz: 100, calorie_goal: 2500, protein_goal_grams: 150 }
    const meals = mealsResult[0]
    const sessions = sessionsResult[0]
    const checkIn = checkInResult[0]

    // Calculate wellness score (average of mental and physical state)
    const wellnessScore = checkIn
      ? ((Number(checkIn.mental_state) + Number(checkIn.physical_state)) / 2).toFixed(1)
      : null

    return NextResponse.json({
      hydration: {
        current: Number(hydrationResult[0]?.total) || 0,
        goal: profile.hydration_goal_oz || 100,
      },
      meals: {
        count: Number(meals?.count) || 0,
        calories: Number(meals?.calories) || 0,
        protein: Number(meals?.protein) || 0,
        carbs: Number(meals?.carbs) || 0,
        fat: Number(meals?.fat) || 0,
        calorieGoal: profile.calorie_goal || 2500,
        proteinGoal: profile.protein_goal_grams || 150,
      },
      sessions: {
        completed: Number(sessions?.completed) || 0,
        total: Number(sessions?.total) || 0,
      },
      wellnessScore,
      upcomingSessions: upcomingSessions.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        time: new Date(s.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        intensity: s.intensity,
      })),
      upcomingAcademics: upcomingAcademics.map(a => ({
        id: a.id,
        title: a.title,
        course: a.course_code || "General",
        dueDate: formatDueDate(new Date(a.due_date)),
        priority: a.priority,
      })),
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Failed to get dashboard data" }, { status: 500 })
  }
}

function formatDueDate(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)

  if (targetDate.getTime() === today.getTime()) {
    return "Today"
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return "Tomorrow"
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}
