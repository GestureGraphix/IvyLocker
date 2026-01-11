import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const result = await sql`
      UPDATE sessions
      SET
        completed = COALESCE(${body.completed ?? null}, completed),
        title = COALESCE(${body.title ?? null}, title),
        type = COALESCE(${body.type ?? null}, type),
        start_at = COALESCE(${body.start_at ?? null}, start_at),
        end_at = COALESCE(${body.end_at ?? null}, end_at),
        intensity = COALESCE(${body.intensity ?? null}, intensity),
        focus = COALESCE(${body.focus ?? null}, focus),
        notes = COALESCE(${body.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({ session: result[0] })
  } catch (error) {
    console.error("Update session error:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await sql`
      DELETE FROM sessions 
      WHERE id = ${id} AND user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete session error:", error)
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
