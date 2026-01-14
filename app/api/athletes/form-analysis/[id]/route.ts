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

    // Get analysis with reference info
    const analysisResult = await sql`
      SELECT fa.*, frv.name as reference_name, frv.video_url as reference_video_url
      FROM form_analyses fa
      LEFT JOIN form_reference_videos frv ON fa.reference_video_id = frv.id
      WHERE fa.id = ${id} AND fa.user_id = ${user.id}
    `

    if (analysisResult.length === 0) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const analysis = analysisResult[0]

    // Get results if completed
    let results = null
    let jointDeviations = null

    if (analysis.status === 'completed') {
      const resultsQuery = await sql`
        SELECT * FROM form_analysis_results
        WHERE analysis_id = ${id}
      `

      if (resultsQuery.length > 0) {
        results = resultsQuery[0]

        // Get joint deviations
        jointDeviations = await sql`
          SELECT * FROM form_joint_deviations
          WHERE result_id = ${results.id}
          ORDER BY deviation_avg DESC
        `
      }
    }

    return NextResponse.json({
      analysis,
      results,
      jointDeviations,
    })
  } catch (error) {
    console.error('Get analysis error:', error)
    return NextResponse.json({ error: 'Failed to get analysis' }, { status: 500 })
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

    const { status, error_message } = await request.json()

    // Verify ownership
    const existing = await sql`
      SELECT * FROM form_analyses
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const result = await sql`
      UPDATE form_analyses
      SET
        status = COALESCE(${status}, status),
        error_message = ${error_message || null},
        completed_at = CASE WHEN ${status} = 'completed' THEN NOW() ELSE completed_at END
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `

    return NextResponse.json({ analysis: result[0] })
  } catch (error) {
    console.error('Update analysis error:', error)
    return NextResponse.json({ error: 'Failed to update analysis' }, { status: 500 })
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

    // Get the analysis to find blob path
    const existing = await sql`
      SELECT * FROM form_analyses
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Delete from Vercel Blob
    try {
      await del(existing[0].video_url)
    } catch (blobError) {
      console.error('Failed to delete blob:', blobError)
    }

    // Delete from database (cascades to results and joint deviations)
    await sql`
      DELETE FROM form_analyses
      WHERE id = ${id} AND user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete analysis error:', error)
    return NextResponse.json({ error: 'Failed to delete analysis' }, { status: 500 })
  }
}
