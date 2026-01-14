import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ references: [] })
    }

    const { searchParams } = new URL(request.url)
    const exerciseType = searchParams.get('exercise_type')

    let references
    if (exerciseType) {
      references = await sql`
        SELECT * FROM form_reference_videos
        WHERE user_id = ${user.id} AND exercise_type = ${exerciseType}
        ORDER BY created_at DESC
      `
    } else {
      references = await sql`
        SELECT * FROM form_reference_videos
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
      `
    }

    return NextResponse.json({ references })
  } catch (error) {
    console.error('Get references error:', error)
    return NextResponse.json({ error: 'Failed to get references' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, exercise_type, video_url, video_blob_path, duration_ms, frame_rate, notes } =
      await request.json()

    if (!name || !exercise_type || !video_url || !video_blob_path) {
      return NextResponse.json(
        { error: 'Missing required fields: name, exercise_type, video_url, video_blob_path' },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO form_reference_videos (
        user_id, name, exercise_type, video_url, video_blob_path,
        duration_ms, frame_rate, notes
      )
      VALUES (
        ${user.id}, ${name}, ${exercise_type}, ${video_url}, ${video_blob_path},
        ${duration_ms || null}, ${frame_rate || null}, ${notes || null}
      )
      RETURNING *
    `

    return NextResponse.json({ reference: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Create reference error:', error)
    return NextResponse.json({ error: 'Failed to create reference' }, { status: 500 })
  }
}
