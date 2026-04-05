import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/physio/exercises - Search exercise library
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Only physios can access exercises' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const region = searchParams.get('region')
    const category = searchParams.get('category')

    let exercises
    if (q) {
      exercises = await sql`
        SELECT * FROM physio_exercises
        WHERE (physio_id IS NULL OR physio_id = ${user.id})
          AND name ILIKE ${'%' + q + '%'}
          ${region ? sql`AND body_region = ${region}` : sql``}
          ${category ? sql`AND category = ${category}` : sql``}
        ORDER BY name
        LIMIT 50
      `
    } else {
      exercises = await sql`
        SELECT * FROM physio_exercises
        WHERE (physio_id IS NULL OR physio_id = ${user.id})
          ${region ? sql`AND body_region = ${region}` : sql``}
          ${category ? sql`AND category = ${category}` : sql``}
        ORDER BY body_region, name
        LIMIT 100
      `
    }

    return NextResponse.json({ exercises })
  } catch (error) {
    console.error('Get exercises error:', error)
    return NextResponse.json({ error: 'Failed to get exercises' }, { status: 500 })
  }
}

// POST /api/physio/exercises - Add custom exercise
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'PHYSIO') {
      return NextResponse.json({ error: 'Only physios can add exercises' }, { status: 403 })
    }

    const body = await request.json()
    const { name, body_region, category, default_sets, default_reps, default_hold_seconds, default_duration_seconds, instructions } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Exercise name is required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO physio_exercises (
        name, body_region, category, default_sets, default_reps,
        default_hold_seconds, default_duration_seconds, instructions, physio_id
      ) VALUES (
        ${name.trim()}, ${body_region || null}, ${category || 'general'},
        ${default_sets || null}, ${default_reps || null},
        ${default_hold_seconds || null}, ${default_duration_seconds || null},
        ${instructions || null}, ${user.id}
      )
      RETURNING *
    `

    return NextResponse.json({ exercise: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Create exercise error:', error)
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
  }
}
