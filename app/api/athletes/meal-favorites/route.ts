import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ favorites: [] })

    const favorites = await sql`
      SELECT * FROM meal_favorites
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error("Get favorites error:", error)
    return NextResponse.json({ error: "Failed to get favorites" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { item_name, location_slug, calories, protein_grams, carbs_grams, fat_grams } = await request.json()

    const result = await sql`
      INSERT INTO meal_favorites (user_id, item_name, location_slug, calories, protein_grams, carbs_grams, fat_grams)
      VALUES (${user.id}, ${item_name}, ${location_slug}, ${calories}, ${protein_grams}, ${carbs_grams}, ${fat_grams})
      ON CONFLICT (user_id, item_name) DO NOTHING
      RETURNING *
    `

    return NextResponse.json({ favorite: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Add favorite error:", error)
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 })
  }
}
