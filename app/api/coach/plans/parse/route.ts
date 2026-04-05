import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { parseWorkoutPlan } from '@/lib/ai/parse-workout-plan'
import type { ParseInput } from '@/lib/ai/parse-workout-plan'

// POST /api/coach/plans/parse - Parse workout text or image with AI
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can parse plans' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    let input: ParseInput = {}

    if (contentType.includes('multipart/form-data')) {
      // Image upload path
      const formData = await request.formData()
      const image = formData.get('image') as File | null
      const text = formData.get('text') as string | null

      if (!image && !text) {
        return NextResponse.json({ error: 'Image or text is required' }, { status: 400 })
      }

      if (image) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!validTypes.includes(image.type)) {
          return NextResponse.json({ error: 'Invalid image type. Supported: JPEG, PNG, GIF, WebP' }, { status: 400 })
        }

        // Validate file size (10MB max)
        if (image.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: 'Image too large. Maximum 10MB.' }, { status: 400 })
        }

        const bytes = await image.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')

        let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
        if (image.type === 'image/png') mediaType = 'image/png'
        else if (image.type === 'image/gif') mediaType = 'image/gif'
        else if (image.type === 'image/webp') mediaType = 'image/webp'

        input.image = { base64, mediaType }
      }

      if (text?.trim()) {
        input.text = text
      }
    } else {
      // JSON text-only path (backward compatible)
      const body = await request.json()
      const { text } = body

      if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: 'Plan text is required' }, { status: 400 })
      }

      input.text = text
    }

    const result = await parseWorkoutPlan(input)

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
