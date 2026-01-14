import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

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

    // Verify analysis ownership
    const analysisCheck = await sql`
      SELECT * FROM form_analyses
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (analysisCheck.length === 0) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    const {
      overall_score,
      consistency_score,
      key_frames,
      total_frames_analyzed,
      avg_deviation_degrees,
      max_deviation_degrees,
      reference_landmarks,
      user_landmarks,
      joint_deviations,
    } = await request.json()

    if (overall_score === undefined || !key_frames) {
      return NextResponse.json(
        { error: 'Missing required fields: overall_score, key_frames' },
        { status: 400 }
      )
    }

    // Create the results record
    const resultInsert = await sql`
      INSERT INTO form_analysis_results (
        analysis_id, overall_score, consistency_score, key_frames,
        total_frames_analyzed, avg_deviation_degrees, max_deviation_degrees,
        reference_landmarks, user_landmarks
      )
      VALUES (
        ${id}, ${overall_score}, ${consistency_score || null}, ${JSON.stringify(key_frames)},
        ${total_frames_analyzed || null}, ${avg_deviation_degrees || null}, ${max_deviation_degrees || null},
        ${reference_landmarks ? JSON.stringify(reference_landmarks) : null},
        ${user_landmarks ? JSON.stringify(user_landmarks) : null}
      )
      RETURNING *
    `

    const result = resultInsert[0]

    // Insert joint deviations if provided
    if (joint_deviations && Array.isArray(joint_deviations)) {
      for (const deviation of joint_deviations) {
        await sql`
          INSERT INTO form_joint_deviations (
            result_id, joint_name, ideal_angle_avg, user_angle_avg,
            deviation_avg, deviation_max, deviation_min,
            frame_deviations, feedback, severity
          )
          VALUES (
            ${result.id}, ${deviation.jointName}, ${deviation.idealAngleAvg},
            ${deviation.userAngleAvg}, ${deviation.deviationAvg},
            ${deviation.deviationMax || null}, ${deviation.deviationMin || null},
            ${deviation.frameDeviations ? JSON.stringify(deviation.frameDeviations) : null},
            ${deviation.feedback || null}, ${deviation.severity || null}
          )
        `
      }
    }

    // Update analysis status to completed
    await sql`
      UPDATE form_analyses
      SET status = 'completed', completed_at = NOW()
      WHERE id = ${id}
    `

    // Fetch the joint deviations we just inserted
    const jointDeviationsResult = await sql`
      SELECT * FROM form_joint_deviations
      WHERE result_id = ${result.id}
      ORDER BY deviation_avg DESC
    `

    return NextResponse.json(
      {
        result,
        jointDeviations: jointDeviationsResult,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Save results error:', error)
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }
}
