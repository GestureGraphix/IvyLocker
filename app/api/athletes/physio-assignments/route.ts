import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/athletes/physio-assignments — athlete sees their own prehab/rehab assignments
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "ATHLETE") return NextResponse.json({ error: "Athletes only" }, { status: 403 })

    const assignments = await sql`
      SELECT
        pa.*,
        u.name as physio_name,
        u.scheduling_link as physio_scheduling_link
      FROM physio_assignments pa
      JOIN users u ON pa.physio_id = u.id
      WHERE pa.athlete_id = ${user.id}
        AND pa.status = 'active'
      ORDER BY pa.type, pa.created_at DESC
    `

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Get athlete physio assignments error:", error)
    return NextResponse.json({ error: "Failed to get assignments" }, { status: 500 })
  }
}
