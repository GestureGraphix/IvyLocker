import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/friends/templates — templates shared with me
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const shared = await sql`
      SELECT
        st.id AS share_id,
        st.created_at AS shared_at,
        st.shared_by,
        u.name AS shared_by_name,
        u.email AS shared_by_email,
        tt.*
      FROM shared_templates st
      JOIN training_templates tt ON tt.id = st.template_id
      JOIN users u ON u.id = st.shared_by
      WHERE st.shared_with = ${user.id}
      ORDER BY st.created_at DESC
    `

    // Enrich with exercises for each template
    if (shared.length === 0) return NextResponse.json({ templates: [] })

    const templateIds = shared.map((r: { id: string }) => r.id)
    const exercises = await sql`
      SELECT te.*, ts2.reps, ts2.weight, ts2.rpe, ts2.sort_order AS set_sort_order, ts2.id AS set_id
      FROM template_exercises te
      LEFT JOIN template_sets ts2 ON ts2.exercise_id = te.id
      WHERE te.template_id = ANY(${templateIds})
      ORDER BY te.template_id, te.sort_order, ts2.sort_order
    `

    // Group sets into exercises
    const exerciseMap = new Map<string, { id: string; name: string; notes: string | null; sort_order: number; sets: any[] }>()
    for (const row of exercises) {
      if (!exerciseMap.has(row.id)) {
        exerciseMap.set(row.id, { id: row.id, name: row.name, notes: row.notes, sort_order: row.sort_order, sets: [] })
      }
      if (row.set_id) {
        exerciseMap.get(row.id)!.sets.push({
          id: row.set_id, reps: row.reps, weight: row.weight, rpe: row.rpe, sort_order: row.set_sort_order
        })
      }
    }

    const templates = shared.map((row: any) => {
      const templateExercises = exercises
        .filter((e: { template_id: string }) => e.template_id === row.id)
        .reduce((acc: any[], e: { id: string }) => {
          if (!acc.find((x: { id: string }) => x.id === e.id)) acc.push(exerciseMap.get(e.id))
          return acc
        }, [])
      return {
        share_id: row.share_id,
        shared_at: row.shared_at,
        shared_by: row.shared_by,
        shared_by_name: row.shared_by_name,
        shared_by_email: row.shared_by_email,
        id: row.id,
        name: row.name,
        type: row.type,
        duration_minutes: row.duration_minutes,
        intensity: row.intensity,
        focus: row.focus,
        notes: row.notes,
        exercises: templateExercises,
      }
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Get shared templates error:", error)
    return NextResponse.json({ error: "Failed to get shared templates" }, { status: 500 })
  }
}

// POST /api/friends/templates — share one of my templates with a friend
// Body: { template_id, friend_id }
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { template_id, friend_id } = await request.json()
    if (!template_id || !friend_id)
      return NextResponse.json({ error: "template_id and friend_id required" }, { status: 400 })

    // Verify caller owns the template
    const tmpl = await sql`SELECT id FROM training_templates WHERE id = ${template_id} AND user_id = ${user.id}`
    if (tmpl.length === 0)
      return NextResponse.json({ error: "Template not found" }, { status: 404 })

    // Verify they are friends
    const friendship = await sql`
      SELECT id FROM friendships
      WHERE status = 'accepted'
        AND ((requester_id = ${user.id} AND addressee_id = ${friend_id})
          OR (requester_id = ${friend_id} AND addressee_id = ${user.id}))
    `
    if (friendship.length === 0)
      return NextResponse.json({ error: "Not friends with this user" }, { status: 403 })

    // Upsert — ignore duplicate shares
    const result = await sql`
      INSERT INTO shared_templates (template_id, shared_by, shared_with)
      VALUES (${template_id}, ${user.id}, ${friend_id})
      ON CONFLICT (template_id, shared_with) DO NOTHING
      RETURNING *
    `

    return NextResponse.json({ shared: result[0] ?? null }, { status: 201 })
  } catch (error) {
    console.error("Share template error:", error)
    return NextResponse.json({ error: "Failed to share template" }, { status: 500 })
  }
}
