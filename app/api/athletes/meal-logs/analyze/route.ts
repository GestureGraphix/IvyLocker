import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const DAILY_LIMIT = 3

const LABEL_PROMPT = `Look at this nutrition label image. Extract the nutritional information.

Return ONLY a JSON object with these fields (use null if not visible):
{
  "description": "Product name if visible",
  "serving_size": "serving size text",
  "calories": number or null,
  "protein_grams": number or null,
  "carbs_grams": number or null,
  "fat_grams": number or null,
  "fiber_grams": number or null,
  "sugar_grams": number or null,
  "sodium_mg": number or null
}

Only return the JSON, no explanation.`

const FOOD_PROMPT = `Look at this food image. Estimate what the food is and provide rough nutritional estimates for the visible portion.

Be conservative with estimates. This is for casual tracking, not medical purposes.

Return ONLY a JSON object:
{
  "description": "Brief description of the food",
  "estimated_calories": number (rough estimate),
  "estimated_protein_grams": number (rough estimate),
  "estimated_carbs_grams": number (rough estimate),
  "estimated_fat_grams": number (rough estimate),
  "confidence": "low" | "medium" | "high",
  "notes": "Any relevant notes about the estimate"
}

Only return the JSON, no explanation.`

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Check daily usage limit
    const usageCount = await sql`
      SELECT COUNT(*)::int as count
      FROM ai_usage_logs
      WHERE user_id = ${user.id}
        AND feature = 'food_analysis'
        AND used_at >= CURRENT_DATE
        AND used_at < CURRENT_DATE + INTERVAL '1 day'
    `

    if (usageCount[0].count >= DAILY_LIMIT) {
      return NextResponse.json({
        error: `Daily limit reached (${DAILY_LIMIT} scans per day). Try again tomorrow.`,
        remaining: 0,
      }, { status: 429 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File | null
    const type = formData.get('type') as string // 'label' or 'food'

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    if (!type || !['label', 'food'].includes(type)) {
      return NextResponse.json({ error: 'Type must be "label" or "food"' }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Determine media type
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
    if (image.type === 'image/png') mediaType = 'image/png'
    else if (image.type === 'image/gif') mediaType = 'image/gif'
    else if (image.type === 'image/webp') mediaType = 'image/webp'

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: type === 'label' ? LABEL_PROMPT : FOOD_PROMPT,
            },
          ],
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Parse JSON response
    let result
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found')
      }
      result = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Log usage
    await sql`
      INSERT INTO ai_usage_logs (user_id, feature)
      VALUES (${user.id}, 'food_analysis')
    `

    const remaining = DAILY_LIMIT - usageCount[0].count - 1

    // Normalize the response
    const normalized = {
      description: result.description || '',
      calories: result.calories ?? result.estimated_calories ?? null,
      protein_grams: result.protein_grams ?? result.estimated_protein_grams ?? null,
      carbs_grams: result.carbs_grams ?? result.estimated_carbs_grams ?? null,
      fat_grams: result.fat_grams ?? result.estimated_fat_grams ?? null,
      confidence: result.confidence || (type === 'label' ? 'high' : 'medium'),
      notes: result.notes || null,
      source: type,
    }

    return NextResponse.json({
      success: true,
      data: normalized,
      remaining,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    })
  } catch (error) {
    console.error('Analyze food error:', error)
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 })
  }
}
