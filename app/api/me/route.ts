import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get full user data with profile
    const result = await sql`
      SELECT
        u.id, u.email, u.name, u.role, u.scheduling_link,
        ap.sport, ap.level, ap.team, ap.position, ap.jersey_number,
        ap.height_cm, ap.weight_kg, ap.phone, ap.location,
        ap.university, ap.graduation_year, ap.allergies, ap.tags,
        ap.hydration_goal_oz, ap.calorie_goal, ap.protein_goal_grams
      FROM users u
      LEFT JOIN athlete_profiles ap ON u.id = ap.user_id
      WHERE u.id = ${user.id}
    `

    return NextResponse.json({ user: result[0] })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { scheduling_link } = body

    if (scheduling_link !== undefined) {
      await sql`
        UPDATE users SET scheduling_link = ${scheduling_link || null} WHERE id = ${user.id}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
