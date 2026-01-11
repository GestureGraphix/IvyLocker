import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { mentalState, physicalState, notes } = await request.json()

    if (!mentalState || !physicalState) {
      return NextResponse.json(
        { error: "Mental state and physical state are required" },
        { status: 400 }
      )
    }

    if (mentalState < 1 || mentalState > 10 || physicalState < 1 || physicalState > 10) {
      return NextResponse.json(
        { error: "States must be between 1 and 10" },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split("T")[0]

    // Upsert - update if exists, insert if not
    const result = await sql`
      INSERT INTO check_in_logs (user_id, date, mental_state, physical_state, notes)
      VALUES (${user.id}, ${today}, ${mentalState}, ${physicalState}, ${notes || null})
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        mental_state = ${mentalState},
        physical_state = ${physicalState},
        notes = ${notes || null},
        created_at = NOW()
      RETURNING id, date, mental_state, physical_state, notes, created_at
    `

    return NextResponse.json({ checkIn: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Check-in error:", error)
    return NextResponse.json({ error: "Failed to save check-in" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    let checkIns
    if (startDate && endDate) {
      checkIns = await sql`
        SELECT id, date, mental_state, physical_state, notes, created_at
        FROM check_in_logs
        WHERE user_id = ${user.id}
          AND date >= ${startDate}
          AND date <= ${endDate}
        ORDER BY date DESC
      `
    } else {
      // Return last 30 days by default
      checkIns = await sql`
        SELECT id, date, mental_state, physical_state, notes, created_at
        FROM check_in_logs
        WHERE user_id = ${user.id}
          AND date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY date DESC
      `
    }

    return NextResponse.json({ checkIns })
  } catch (error) {
    console.error("Get check-ins error:", error)
    return NextResponse.json({ error: "Failed to get check-ins" }, { status: 500 })
  }
}
