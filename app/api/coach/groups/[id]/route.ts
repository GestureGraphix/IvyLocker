import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/coach/groups/[id] - Get group details with members
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

    // Get group
    const groupResult = await sql`
      SELECT id, name, slug, color, description, created_at
      FROM athlete_groups
      WHERE id = ${id} AND coach_id = ${user.id}
    `

    if (groupResult.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get members
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

    return NextResponse.json({
      group: {
        ...groupResult[0],
        members
      }
    })
  } catch (error) {
    console.error('Get group error:', error)
    return NextResponse.json({ error: 'Failed to get group' }, { status: 500 })
  }
}

// PATCH /api/coach/groups/[id] - Update group
export async function PATCH(
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
    const { name, slug, color, description } = body

    // Validate slug if provided
    if (slug) {
      const slugRegex = /^[a-z0-9-]+$/
      if (!slugRegex.test(slug)) {
        return NextResponse.json({
          error: 'Slug must be lowercase letters, numbers, and hyphens only'
        }, { status: 400 })
      }
    }

    const result = await sql`
      UPDATE athlete_groups
      SET
        name = COALESCE(${name ?? null}, name),
        slug = COALESCE(${slug ?? null}, slug),
        color = COALESCE(${color ?? null}, color),
        description = COALESCE(${description ?? null}, description),
        updated_at = NOW()
      WHERE id = ${id} AND coach_id = ${user.id}
      RETURNING id, name, slug, color, description, created_at, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json({ group: result[0] })
  } catch (error: any) {
    console.error('Update group error:', error)

    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return NextResponse.json({ error: 'A group with this slug already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }
}

// DELETE /api/coach/groups/[id] - Delete group
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

    const result = await sql`
      DELETE FROM athlete_groups
      WHERE id = ${id} AND coach_id = ${user.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete group error:', error)
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
  }
}
