import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// PATCH /api/physio/assignments/[id] — update status or details
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { id } = await params
    const body = await request.json()
    const { title, description, type, exercises, frequency, duration_weeks, notes, status } = body

    const result = await sql`
      UPDATE physio_assignments SET
        title          = COALESCE(${title ?? null}, title),
        description    = COALESCE(${description ?? null}, description),
        type           = COALESCE(${type ?? null}, type),
        exercises      = COALESCE(${exercises ? JSON.stringify(exercises) : null}::jsonb, exercises),
        frequency      = COALESCE(${frequency ?? null}, frequency),
        duration_weeks = COALESCE(${duration_weeks ?? null}, duration_weeks),
        notes          = COALESCE(${notes ?? null}, notes),
        status         = COALESCE(${status ?? null}, status),
        updated_at     = NOW()
      WHERE id = ${id} AND physio_id = ${user.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    return NextResponse.json({ assignment: result[0] })
  } catch (error) {
    console.error("Update physio assignment error:", error)
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 })
  }
}

// DELETE /api/physio/assignments/[id]
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (user.role !== "PHYSIO") return NextResponse.json({ error: "Physios only" }, { status: 403 })

    const { id } = await params

    await sql`DELETE FROM physio_assignments WHERE id = ${id} AND physio_id = ${user.id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete physio assignment error:", error)
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 })
  }
}
