import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const result = await sql`
      SELECT u.name, u.email, u.role,
        ap.sport, ap.team, ap.position, ap.jersey_number, ap.university, ap.graduation_year,
        ap.height_cm, ap.weight_kg, ap.hydration_goal_oz, ap.calorie_goal,
        ap.protein_goal_grams, ap.phone, ap.location
      FROM users u
      LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
      WHERE u.id = ${user.id}
    `

    return NextResponse.json({ profile: result[0] || {} })
  } catch (error) {
    console.error("Get profile error:", error)
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Update user name if provided
    if (body.name) {
      await sql`
        UPDATE users SET name = ${body.name}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    // Upsert athlete profile (creates row if it doesn't exist yet)
    await sql`
      INSERT INTO athlete_profiles (user_id, sport, team, position, jersey_number, phone, location, university, graduation_year, height_cm, weight_kg, hydration_goal_oz, calorie_goal, protein_goal_grams)
      VALUES (
        ${user.id},
        ${body.sport ?? null}, ${body.team ?? null}, ${body.position ?? null},
        ${body.jersey_number ?? null}, ${body.phone ?? null}, ${body.location ?? null},
        ${body.university ?? null}, ${body.graduation_year ?? null},
        ${body.height_cm ?? null}, ${body.weight_kg ?? null},
        ${body.hydration_goal_oz ?? 100}, ${body.calorie_goal ?? 2500}, ${body.protein_goal_grams ?? 150}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        sport = COALESCE(EXCLUDED.sport, athlete_profiles.sport),
        team = COALESCE(EXCLUDED.team, athlete_profiles.team),
        position = COALESCE(EXCLUDED.position, athlete_profiles.position),
        jersey_number = COALESCE(EXCLUDED.jersey_number, athlete_profiles.jersey_number),
        phone = COALESCE(EXCLUDED.phone, athlete_profiles.phone),
        location = COALESCE(EXCLUDED.location, athlete_profiles.location),
        university = COALESCE(EXCLUDED.university, athlete_profiles.university),
        graduation_year = COALESCE(EXCLUDED.graduation_year, athlete_profiles.graduation_year),
        height_cm = COALESCE(EXCLUDED.height_cm, athlete_profiles.height_cm),
        weight_kg = COALESCE(EXCLUDED.weight_kg, athlete_profiles.weight_kg),
        hydration_goal_oz = COALESCE(EXCLUDED.hydration_goal_oz, athlete_profiles.hydration_goal_oz),
        calorie_goal = COALESCE(EXCLUDED.calorie_goal, athlete_profiles.calorie_goal),
        protein_goal_grams = COALESCE(EXCLUDED.protein_goal_grams, athlete_profiles.protein_goal_grams),
        updated_at = NOW()
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
