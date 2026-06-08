import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/friends — list accepted friends + pending requests (both directions)
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const friends = await sql`
      SELECT
        f.id,
        f.status,
        f.created_at,
        f.requester_id,
        f.addressee_id,
        CASE
          WHEN f.requester_id = ${user.id} THEN u2.id
          ELSE u1.id
        END AS friend_id,
        CASE
          WHEN f.requester_id = ${user.id} THEN u2.name
          ELSE u1.name
        END AS friend_name,
        CASE
          WHEN f.requester_id = ${user.id} THEN u2.email
          ELSE u1.email
        END AS friend_email,
        CASE
          WHEN f.requester_id = ${user.id} THEN u2.role
          ELSE u1.role
        END AS friend_role
      FROM friendships f
      JOIN users u1 ON u1.id = f.requester_id
      JOIN users u2 ON u2.id = f.addressee_id
      WHERE f.requester_id = ${user.id} OR f.addressee_id = ${user.id}
      ORDER BY f.created_at DESC
    `

    return NextResponse.json({ friends })
  } catch (error) {
    console.error("Get friends error:", error)
    return NextResponse.json({ error: "Failed to get friends" }, { status: 500 })
  }
}

// POST /api/friends — send a friend request by email
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })
    if (email.toLowerCase() === user.email.toLowerCase())
      return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 })

    const targets = await sql`
      SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER(${email})
    `
    if (targets.length === 0)
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 })

    const target = targets[0]

    // Check if friendship already exists in either direction
    const existing = await sql`
      SELECT id, status FROM friendships
      WHERE (requester_id = ${user.id} AND addressee_id = ${target.id})
         OR (requester_id = ${target.id} AND addressee_id = ${user.id})
    `
    if (existing.length > 0) {
      const status = existing[0].status
      if (status === "accepted") return NextResponse.json({ error: "Already friends" }, { status: 409 })
      if (status === "pending") return NextResponse.json({ error: "Request already pending" }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO friendships (requester_id, addressee_id, status)
      VALUES (${user.id}, ${target.id}, 'pending')
      RETURNING *
    `

    return NextResponse.json({
      friendship: {
        ...result[0],
        friend_id: target.id,
        friend_name: target.name,
        friend_email: target.email,
        friend_role: target.role,
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Send friend request error:", error)
    return NextResponse.json({ error: "Failed to send request" }, { status: 500 })
  }
}
