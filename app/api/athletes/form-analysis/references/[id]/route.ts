import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { del } from '@vercel/blob'

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

    const result = await sql`
      SELECT * FROM form_reference_videos
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 })
    }

    return NextResponse.json({ reference: result[0] })
  } catch (error) {
    console.error('Get reference error:', error)
    return NextResponse.json({ error: 'Failed to get reference' }, { status: 500 })
  }
}

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

    const { name, notes } = await request.json()

    // Verify ownership
    const existing = await sql`
      SELECT * FROM form_reference_videos
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 })
    }

    const result = await sql`
      UPDATE form_reference_videos
      SET
        name = COALESCE(${name}, name),
        notes = COALESCE(${notes}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `

    return NextResponse.json({ reference: result[0] })
  } catch (error) {
    console.error('Update reference error:', error)
    return NextResponse.json({ error: 'Failed to update reference' }, { status: 500 })
  }
}

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

    // Get the reference to find blob path
    const existing = await sql`
      SELECT * FROM form_reference_videos
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 })
    }

    // Delete from Vercel Blob
    try {
      await del(existing[0].video_url)
    } catch (blobError) {
      console.error('Failed to delete blob:', blobError)
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await sql`
      DELETE FROM form_reference_videos
      WHERE id = ${id} AND user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete reference error:', error)
    return NextResponse.json({ error: 'Failed to delete reference' }, { status: 500 })
  }
}
