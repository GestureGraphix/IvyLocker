import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/coach/groups - List all groups for the coach
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can manage groups' }, { status: 403 })
    }

    // Get groups with member count
    const groups = await sql`
      SELECT
        g.id,
        g.name,
        g.slug,
        g.color,
        g.description,
        g.created_at,
        COUNT(m.id)::int as member_count
      FROM athlete_groups g
      LEFT JOIN athlete_group_members m ON m.group_id = g.id
      WHERE g.coach_id = ${user.id}
      GROUP BY g.id
      ORDER BY g.name
    `

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Get groups error:', error)
    return NextResponse.json({ error: 'Failed to get groups' }, { status: 500 })
  }
}

// POST /api/coach/groups - Create a new group
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can manage groups' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, color, description } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Validate slug format (lowercase, alphanumeric, hyphens)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json({
        error: 'Slug must be lowercase letters, numbers, and hyphens only'
      }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO athlete_groups (coach_id, name, slug, color, description)
      VALUES (${user.id}, ${name}, ${slug}, ${color || '#6366f1'}, ${description || null})
      RETURNING id, name, slug, color, description, created_at
    `

    return NextResponse.json({ group: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error('Create group error:', error)

    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      return NextResponse.json({ error: 'A group with this slug already exists' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
