import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ logs: [] })
    }

    const logs = await sql`
      SELECT * FROM hydration_logs 
      WHERE user_id = ${user.id}
      ORDER BY date DESC, time DESC
      LIMIT 100
    `

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Get hydration logs error:", error)
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ounces, source, date, time } = await request.json()

    const result = await sql`
      INSERT INTO hydration_logs (user_id, ounces, source, date, time)
      VALUES (${user.id}, ${ounces}, ${source}, ${date}, ${time})
      RETURNING *
    `

    return NextResponse.json({ log: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create hydration log error:", error)
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 })
  }
}
