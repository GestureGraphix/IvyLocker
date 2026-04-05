import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTodayRecommendation, generateAndSaveRecommendation } from '@/lib/ai/generate-recommendation'

// GET /api/athletes/recommendations - Get today's recommendation
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recommendation = await getTodayRecommendation(user.id)

    if (!recommendation) {
      return NextResponse.json({
        recommendation: null,
        message: 'No recommendation available for today',
      })
    }

    return NextResponse.json({
      recommendation: {
        id: recommendation.id,
        text: recommendation.recommendation_text,
        priorityFocus: recommendation.priority_focus,
        generatedAt: recommendation.generated_at,
      },
    })
  } catch (error) {
    console.error('Get recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendation' },
      { status: 500 }
    )
  }
}

// POST /api/athletes/recommendations - Generate a new recommendation (manual trigger)
export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate new recommendation (always fresh — uses current user's data only)
    const result = await generateAndSaveRecommendation(user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate recommendation' },
        { status: 500 }
      )
    }

    // Fetch the saved recommendation
    const recommendation = await getTodayRecommendation(user.id)

    return NextResponse.json({
      recommendation: recommendation
        ? {
            id: recommendation.id,
            text: recommendation.recommendation_text,
            priorityFocus: recommendation.priority_focus,
            generatedAt: recommendation.generated_at,
          }
        : null,
      message: 'Recommendation generated successfully',
      cached: false,
    })
  } catch (error) {
    console.error('Generate recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendation' },
      { status: 500 }
    )
  }
}
