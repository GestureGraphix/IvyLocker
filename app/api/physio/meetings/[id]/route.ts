import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { id } = await params
    const { status, title, notes, scheduledAt, durationMinutes } = await request.json()

    const result = await sql`
      UPDATE physio_meetings SET
        status           = COALESCE(${status ?? null}, status),
        title            = COALESCE(${title ?? null}, title),
        notes            = COALESCE(${notes ?? null}, notes),
        scheduled_at     = COALESCE(${scheduledAt ?? null}::timestamptz, scheduled_at),
        duration_minutes = COALESCE(${durationMinutes ?? null}, duration_minutes),
        updated_at       = NOW()
      WHERE id = ${id} AND physio_id = ${user.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    return NextResponse.json({ meeting: result[0] })
  } catch (error) {
    console.error("Update physio meeting error:", error)
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 })
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { id } = await params
    await sql`DELETE FROM physio_meetings WHERE id = ${id} AND physio_id = ${user.id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete physio meeting error:", error)
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 })
  }
}
