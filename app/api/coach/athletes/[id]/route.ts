import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/coach/athletes/[id] - Get detailed athlete data for coach view
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id: athleteId } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "COACH") {
      return NextResponse.json({ error: "Not authorized - coaches only" }, { status: 403 })
    }

    // Verify this athlete is linked to the coach
    const linkCheck = await sql`
      SELECT id FROM coach_athletes
      WHERE coach_id = ${user.id} AND athlete_id = ${athleteId}
    `

    if (linkCheck.length === 0) {
      return NextResponse.json({ error: "Athlete not found in your roster" }, { status: 404 })
    }

    // Get athlete basic info
    const athleteResult = await sql`
      SELECT
        u.id, u.email, u.name, u.created_at,
        ap.sport, ap.team, ap.position, ap.university,
        ap.height_cm, ap.weight_kg, ap.tags, ap.level,
        ap.hydration_goal_oz, ap.calorie_goal, ap.protein_goal_grams
      FROM users u
      LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
      WHERE u.id = ${athleteId}
    `

    if (athleteResult.length === 0) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const athlete = athleteResult[0]

    // Get recent check-ins (last 7 days)
    const checkIns = await sql`
      SELECT date, mental_state, physical_state, notes
      FROM check_in_logs
      WHERE user_id = ${athleteId}
        AND date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date DESC
    `

    // Get today's stats
    const today = new Date().toISOString().split("T")[0]

    const hydrationResult = await sql`
      SELECT COALESCE(SUM(ounces), 0)::int as total
      FROM hydration_logs
      WHERE user_id = ${athleteId} AND date = ${today}
    `

    const mealsResult = await sql`
      SELECT
        COUNT(*)::int as count,
        COALESCE(SUM(calories), 0)::int as calories,
        COALESCE(SUM(protein_grams), 0)::int as protein
      FROM meal_logs
      WHERE user_id = ${athleteId} AND DATE(date_time) = ${today}
    `

    // Get upcoming sessions (next 7 days)
    const sessions = await sql`
      SELECT id, title, type, start_at, end_at, intensity, completed, assigned_by
      FROM sessions
      WHERE user_id = ${athleteId}
        AND start_at >= CURRENT_DATE
        AND start_at < CURRENT_DATE + INTERVAL '7 days'
      ORDER BY start_at
    `

    // Get training compliance (last 14 days)
    const complianceResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE completed = true)::int as completed,
        COUNT(*)::int as total
      FROM sessions
      WHERE user_id = ${athleteId}
        AND start_at >= CURRENT_DATE - INTERVAL '14 days'
        AND start_at < CURRENT_DATE
    `

    const compliance = complianceResult[0]
    const complianceRate = compliance.total > 0
      ? Math.round((compliance.completed / compliance.total) * 100)
      : null

    return NextResponse.json({
      athlete,
      checkIns,
      todayStats: {
        hydration: hydrationResult[0].total,
        hydrationGoal: athlete.hydration_goal_oz || 100,
        meals: mealsResult[0].count,
        calories: mealsResult[0].calories,
        calorieGoal: athlete.calorie_goal || 2500,
        protein: mealsResult[0].protein,
        proteinGoal: athlete.protein_goal_grams || 150,
      },
      sessions,
      compliance: {
        completed: compliance.completed,
        total: compliance.total,
        rate: complianceRate,
      },
    })
  } catch (error) {
    console.error("Get athlete detail error:", error)
    return NextResponse.json({ error: "Failed to get athlete data" }, { status: 500 })
  }
}
