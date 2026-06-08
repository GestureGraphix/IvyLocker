import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// PATCH /api/friends/invites/[id] — accept or decline an invite
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { action } = await request.json() // "accept" | "decline"

    if (!["accept", "decline"].includes(action))
      return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 })

    // Only the invitee can respond
    const rows = await sql`
      SELECT * FROM workout_invites WHERE id = ${id} AND invitee_id = ${user.id} AND status = 'pending'
    `
    if (rows.length === 0)
      return NextResponse.json({ error: "Invite not found" }, { status: 404 })

    const invite = rows[0]
    const newStatus = action === "accept" ? "accepted" : "declined"

    const updated = await sql`
      UPDATE workout_invites SET status = ${newStatus} WHERE id = ${id} RETURNING *
    `

    // If accepted and there's a template_id, create a session for the invitee from that template
    if (action === "accept" && invite.template_id) {
      const tmpl = await sql`SELECT * FROM training_templates WHERE id = ${invite.template_id}`
      if (tmpl.length > 0) {
        const t = tmpl[0]
        const scheduledDate = invite.scheduled_for
          ? new Date(invite.scheduled_for).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]
        const startTime = invite.scheduled_for
          ? new Date(invite.scheduled_for).toISOString()
          : new Date().toISOString()
        const endTime = new Date(new Date(startTime).getTime() + (t.duration_minutes || 60) * 60000).toISOString()

        await sql`
          INSERT INTO training_sessions (user_id, type, title, start_at, end_at, intensity, focus, notes)
          VALUES (
            ${user.id},
            ${t.type},
            ${t.name || "Workout with friend"},
            ${startTime},
            ${endTime},
            ${t.intensity || "medium"},
            ${t.focus || null},
            ${invite.message ? `From ${invite.inviter_id}: ${invite.message}` : null}
          )
        `
      }
    }

    return NextResponse.json({ invite: updated[0] })
  } catch (error) {
    console.error("Respond to invite error:", error)
    return NextResponse.json({ error: "Failed to respond to invite" }, { status: 500 })
  }
}
