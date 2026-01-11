import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ items: [] })
    }

    const items = await sql`
      SELECT ai.*, c.name as course_name
      FROM academic_items ai
      LEFT JOIN courses c ON ai.course_id = c.id
      WHERE ai.user_id = ${user.id}
      ORDER BY ai.due_date ASC
    `

    return NextResponse.json({ items })
  } catch (error) {
    console.error("Get academic items error:", error)
    return NextResponse.json({ error: "Failed to get items" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { course_id, type, title, due_date, priority, notes } = await request.json()

    const result = await sql`
      INSERT INTO academic_items (user_id, course_id, type, title, due_date, priority, notes)
      VALUES (${user.id}, ${course_id}, ${type}, ${title}, ${due_date}, ${priority}, ${notes || null})
      RETURNING *
    `

    return NextResponse.json({ item: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create academic item error:", error)
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 })
  }
}
