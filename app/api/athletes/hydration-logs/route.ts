import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// Get local date string in YYYY-MM-DD format
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ logs: [], todayTotal: 0 })
    }

    // Get client's local date from query param, or use server date
    const { searchParams } = new URL(request.url)
    const clientDate = searchParams.get('date') || getLocalDateString()

    // Get all logs
    const logs = await sql`
      SELECT
        id,
        ounces,
        source,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        TO_CHAR(time, 'HH24:MI') as time,
        created_at
      FROM hydration_logs
      WHERE user_id = ${user.id}
      ORDER BY date DESC, time DESC
      LIMIT 100
    `

    // Get today's total
    const todayResult = await sql`
      SELECT COALESCE(SUM(ounces), 0) as total
      FROM hydration_logs
      WHERE user_id = ${user.id}
        AND date = ${clientDate}::date
    `

    return NextResponse.json({
      logs,
      todayTotal: Number(todayResult[0]?.total) || 0
    })
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
      VALUES (${user.id}, ${ounces}, ${source}, ${date}::date, ${time}::time)
      RETURNING
        id,
        ounces,
        source,
        TO_CHAR(date, 'YYYY-MM-DD') as date,
        TO_CHAR(time, 'HH24:MI') as time,
        created_at
    `

    return NextResponse.json({ log: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Create hydration log error:", error)
    return NextResponse.json({ error: "Failed to create log" }, { status: 500 })
  }
}
