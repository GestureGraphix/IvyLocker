import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ analyses: [] })
    }

    const { searchParams } = new URL(request.url)
    const exerciseType = searchParams.get('exercise_type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    let analyses
    if (exerciseType && status) {
      analyses = await sql`
        SELECT fa.*, frv.name as reference_name
        FROM form_analyses fa
        LEFT JOIN form_reference_videos frv ON fa.reference_video_id = frv.id
        WHERE fa.user_id = ${user.id}
          AND fa.exercise_type = ${exerciseType}
          AND fa.status = ${status}
        ORDER BY fa.created_at DESC
        LIMIT ${limit}
      `
    } else if (exerciseType) {
      analyses = await sql`
        SELECT fa.*, frv.name as reference_name
        FROM form_analyses fa
        LEFT JOIN form_reference_videos frv ON fa.reference_video_id = frv.id
        WHERE fa.user_id = ${user.id}
          AND fa.exercise_type = ${exerciseType}
        ORDER BY fa.created_at DESC
        LIMIT ${limit}
      `
    } else if (status) {
      analyses = await sql`
        SELECT fa.*, frv.name as reference_name
        FROM form_analyses fa
        LEFT JOIN form_reference_videos frv ON fa.reference_video_id = frv.id
        WHERE fa.user_id = ${user.id}
          AND fa.status = ${status}
        ORDER BY fa.created_at DESC
        LIMIT ${limit}
      `
    } else {
      analyses = await sql`
        SELECT fa.*, frv.name as reference_name
        FROM form_analyses fa
        LEFT JOIN form_reference_videos frv ON fa.reference_video_id = frv.id
        WHERE fa.user_id = ${user.id}
        ORDER BY fa.created_at DESC
        LIMIT ${limit}
      `
    }

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error('Get analyses error:', error)
    return NextResponse.json({ error: 'Failed to get analyses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      reference_video_id,
      exercise_type,
      video_url,
      video_blob_path,
      duration_ms,
    } = await request.json()

    if (!exercise_type || !video_url || !video_blob_path) {
      return NextResponse.json(
        { error: 'Missing required fields: exercise_type, video_url, video_blob_path' },
        { status: 400 }
      )
    }

    // Verify reference video belongs to user if provided
    if (reference_video_id) {
      const refCheck = await sql`
        SELECT id FROM form_reference_videos
        WHERE id = ${reference_video_id} AND user_id = ${user.id}
      `
      if (refCheck.length === 0) {
        return NextResponse.json({ error: 'Reference video not found' }, { status: 404 })
      }
    }

    const result = await sql`
      INSERT INTO form_analyses (
        user_id, reference_video_id, exercise_type,
        video_url, video_blob_path, duration_ms, status
      )
      VALUES (
        ${user.id}, ${reference_video_id || null}, ${exercise_type},
        ${video_url}, ${video_blob_path}, ${duration_ms || null}, 'pending'
      )
      RETURNING *
    `

    return NextResponse.json({ analysis: result[0] }, { status: 201 })
  } catch (error) {
    console.error('Create analysis error:', error)
    return NextResponse.json({ error: 'Failed to create analysis' }, { status: 500 })
  }
}
