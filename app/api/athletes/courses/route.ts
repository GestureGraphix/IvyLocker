import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ courses: [] })
    }

    const courses = await sql`
      SELECT * FROM courses 
      WHERE user_id = ${user.id}
      ORDER BY name ASC
    `

    return NextResponse.json({ courses })
  } catch (error) {
    console.error("Get courses error:", error)
    return NextResponse.json({ error: "Failed to get courses" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, code, instructor, schedule } = await request.json()

    const result = await sql`
      INSERT INTO courses (user_id, name, code, instructor, schedule)
      VALUES (${user.id}, ${name}, ${code}, ${instructor || null}, ${schedule || null})
      RETURNING *
    `

    return NextResponse.json({ course: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create course error:", error)
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}
