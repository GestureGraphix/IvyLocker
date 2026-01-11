import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ meals: [] })
    }

    const meals = await sql`
      SELECT * FROM meal_logs 
      WHERE user_id = ${user.id}
      ORDER BY date_time DESC
      LIMIT 50
    `

    return NextResponse.json({ meals })
  } catch (error) {
    console.error("Get meals error:", error)
    return NextResponse.json({ error: "Failed to get meals" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { meal_type, description, calories, protein_grams, carbs_grams, fat_grams, date_time } = await request.json()

    const result = await sql`
      INSERT INTO meal_logs (user_id, meal_type, description, calories, protein_grams, carbs_grams, fat_grams, date_time)
      VALUES (${user.id}, ${meal_type}, ${description}, ${calories}, ${protein_grams}, ${carbs_grams}, ${fat_grams}, ${date_time})
      RETURNING *
    `

    return NextResponse.json({ meal: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create meal error:", error)
    return NextResponse.json({ error: "Failed to create meal" }, { status: 500 })
  }
}
