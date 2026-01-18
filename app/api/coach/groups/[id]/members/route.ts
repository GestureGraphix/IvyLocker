import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/coach/groups/[id]/members - List members of a group
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can manage groups' }, { status: 403 })
    }

    // Verify group belongs to coach
    const groupCheck = await sql`
      SELECT id FROM athlete_groups WHERE id = ${id} AND coach_id = ${user.id}
    `
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const members = await sql`
      SELECT
        u.id,
        u.name,
        u.email,
        ap.sport,
        ap.position,
        m.added_at
      FROM athlete_group_members m
      JOIN users u ON u.id = m.athlete_id
      LEFT JOIN athlete_profiles ap ON ap.user_id = u.id
      WHERE m.group_id = ${id}
      ORDER BY u.name
    `

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Failed to get members' }, { status: 500 })
  }
}

// POST /api/coach/groups/[id]/members - Add athletes to group
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can manage groups' }, { status: 403 })
    }

    const body = await request.json()
    const { athleteIds } = body

    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json({ error: 'athleteIds array is required' }, { status: 400 })
    }

    // Verify group belongs to coach
    const groupCheck = await sql`
      SELECT id FROM athlete_groups WHERE id = ${id} AND coach_id = ${user.id}
    `
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Verify all athletes exist and are athletes (not coaches)
    const validAthletes = await sql`
      SELECT id FROM users WHERE id = ANY(${athleteIds}) AND role = 'ATHLETE'
    `
    const validIds = validAthletes.map((a: { id: string }) => a.id)

    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid athletes found' }, { status: 400 })
    }

    // Add athletes to group (ignore duplicates)
    let addedCount = 0
    for (const athleteId of validIds) {
      try {
        await sql`
          INSERT INTO athlete_group_members (athlete_id, group_id, added_by)
          VALUES (${athleteId}, ${id}, ${user.id})
          ON CONFLICT (athlete_id, group_id) DO NOTHING
        `
        addedCount++
      } catch (err) {
        // Continue on individual errors
        console.error(`Failed to add athlete ${athleteId}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      added: addedCount,
      message: `Added ${addedCount} athlete(s) to group`
    })
  } catch (error) {
    console.error('Add members error:', error)
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 })
  }
}

// DELETE /api/coach/groups/[id]/members - Remove athletes from group
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can manage groups' }, { status: 403 })
    }

    const body = await request.json()
    const { athleteIds } = body

    if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
      return NextResponse.json({ error: 'athleteIds array is required' }, { status: 400 })
    }

    // Verify group belongs to coach
    const groupCheck = await sql`
      SELECT id FROM athlete_groups WHERE id = ${id} AND coach_id = ${user.id}
    `
    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Remove athletes from group
    const result = await sql`
      DELETE FROM athlete_group_members
      WHERE group_id = ${id} AND athlete_id = ANY(${athleteIds})
    `

    return NextResponse.json({
      success: true,
      message: 'Athletes removed from group'
    })
  } catch (error) {
    console.error('Remove members error:', error)
    return NextResponse.json({ error: 'Failed to remove members' }, { status: 500 })
  }
}
