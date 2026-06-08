import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/friends/invites — get my incoming + outgoing workout invites
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const invites = await sql`
      SELECT
        wi.*,
        u_inviter.name AS inviter_name,
        u_inviter.email AS inviter_email,
        u_invitee.name AS invitee_name,
        u_invitee.email AS invitee_email,
        tt.name AS template_name,
        tt.type AS template_type,
        tt.duration_minutes AS template_duration
      FROM workout_invites wi
      JOIN users u_inviter ON u_inviter.id = wi.inviter_id
      JOIN users u_invitee ON u_invitee.id = wi.invitee_id
      LEFT JOIN training_templates tt ON tt.id = wi.template_id
      WHERE wi.inviter_id = ${user.id} OR wi.invitee_id = ${user.id}
      ORDER BY wi.created_at DESC
    `

    return NextResponse.json({ invites })
  } catch (error) {
    console.error("Get invites error:", error)
    return NextResponse.json({ error: "Failed to get invites" }, { status: 500 })
  }
}

// POST /api/friends/invites — send a workout invite to a friend
// Body: { invitee_id, title, scheduled_for?, template_id?, message? }
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { invitee_id, title, scheduled_for, template_id, message } = await request.json()
    if (!invitee_id || !title)
      return NextResponse.json({ error: "invitee_id and title required" }, { status: 400 })

    // Verify friendship
    const friendship = await sql`
      SELECT id FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = ${user.id} AND addressee_id = ${invitee_id})
          OR (requester_id = ${invitee_id} AND addressee_id = ${user.id}))
    `
    if (friendship.length === 0)
      return NextResponse.json({ error: "Not friends with this user" }, { status: 403 })

    const result = await sql`
      INSERT INTO workout_invites (inviter_id, invitee_id, title, scheduled_for, template_id, message)
      VALUES (
        ${user.id},
        ${invitee_id},
        ${title},
        ${scheduled_for || null},
        ${template_id || null},
        ${message || null}
      )
      RETURNING *
    `

    return NextResponse.json({ invite: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Send invite error:", error)
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 })
  }
}
