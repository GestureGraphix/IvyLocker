import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { parseWorkoutPlan } from '@/lib/ai/parse-workout-plan'

// POST /api/coach/plans/parse - Parse workout text with AI
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can parse plans' }, { status: 403 })
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Plan text is required' }, { status: 400 })
    }

    const result = await parseWorkoutPlan(text)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      plan: result.plan,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    })
  } catch (error) {
    console.error('Parse plan error:', error)
    return NextResponse.json({ error: 'Failed to parse plan' }, { status: 500 })
  }
}
