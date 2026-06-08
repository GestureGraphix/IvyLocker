import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// PATCH /api/friends/[id] — accept or decline a pending request
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const { action } = await request.json() // "accept" | "decline"

    if (!["accept", "decline"].includes(action))
      return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 })

    // Only the addressee can accept/decline
    const rows = await sql`
      SELECT * FROM friendships WHERE id = ${id} AND addressee_id = ${user.id} AND status = 'pending'
    `
    if (rows.length === 0)
      return NextResponse.json({ error: "Request not found" }, { status: 404 })

    const newStatus = action === "accept" ? "accepted" : "declined"
    const updated = await sql`
      UPDATE friendships SET status = ${newStatus} WHERE id = ${id} RETURNING *
    `

    return NextResponse.json({ friendship: updated[0] })
  } catch (error) {
    console.error("Respond to friend request error:", error)
    return NextResponse.json({ error: "Failed to respond" }, { status: 500 })
  }
}

// DELETE /api/friends/[id] — remove a friend or cancel/decline a request
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const rows = await sql`
      SELECT * FROM friendships
      WHERE id = ${id} AND (requester_id = ${user.id} OR addressee_id = ${user.id})
    `
    if (rows.length === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    await sql`DELETE FROM friendships WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove friend error:", error)
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 })
  }
}
