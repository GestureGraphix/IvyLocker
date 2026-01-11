import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

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

    // Update athlete profile
    await sql`
      UPDATE athlete_profiles SET
        sport = COALESCE(${body.sport ?? null}, sport),
        team = COALESCE(${body.team ?? null}, team),
        position = COALESCE(${body.position ?? null}, position),
        phone = COALESCE(${body.phone ?? null}, phone),
        location = COALESCE(${body.location ?? null}, location),
        university = COALESCE(${body.university ?? null}, university),
        graduation_year = COALESCE(${body.graduation_year ?? null}, graduation_year),
        height_cm = COALESCE(${body.height_cm ?? null}, height_cm),
        weight_kg = COALESCE(${body.weight_kg ?? null}, weight_kg),
        hydration_goal_oz = COALESCE(${body.hydration_goal_oz ?? null}, hydration_goal_oz),
        calorie_goal = COALESCE(${body.calorie_goal ?? null}, calorie_goal),
        protein_goal_grams = COALESCE(${body.protein_goal_grams ?? null}, protein_goal_grams),
        updated_at = NOW()
      WHERE user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
