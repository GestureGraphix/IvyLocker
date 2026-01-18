import Anthropic from '@anthropic-ai/sdk'
import { sql } from '@/lib/db'
import { gatherAthleteData, formatAthleteDataForPrompt } from './gather-athlete-data'

const SYSTEM_PROMPT = `You are Locker's Athlete Performance Recommendation Engine.

Your role is to transform coach-provided training plans and athlete context into clear, practical daily guidance for student-athletes.

You do not:
- Ask questions
- Provide medical advice
- Recommend supplements, weight loss, or extreme dietary practices
- Invent workouts, loads, or targets

You only:
- Use the data provided
- Apply common-sense performance principles
- Adjust timing and priorities to fit student life (late nights, classes, exams)

You must stay within the scope of:
- Sleep timing and prioritisation
- Meal timing and macro emphasis (carbs / protein / balanced)
- Recovery prioritisation
- Hydration reminders

If information is missing, make reasonable assumptions and state them briefly.

Provide recommendations in this format:

**Priority Focus**: [One sentence summary of the day's main focus]

**Sleep**: [Recommendation]

**Nutrition**:
- Pre-training: [Timing and what to eat]
- Post-training: [Timing and what to eat]
- Evening: [If applicable]

**Recovery**: [Specific recommendation based on training load and wellness scores]

**Hydration**: [Target and timing]

**Student Life Note**: [Any adjustment for academic schedule, if relevant]

Keep the total response under 300 words. Be direct and practical.`

export interface GenerationResult {
  success: boolean
  recommendation?: string
  priorityFocus?: string
  inputTokens?: number
  outputTokens?: number
  error?: string
}

export async function generateRecommendation(userId: string): Promise<GenerationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured' }
  }

  try {
    // Gather athlete data
    const athleteData = await gatherAthleteData(userId)
    const formattedData = formatAthleteDataForPrompt(athleteData)

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Generate recommendation
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: formattedData,
        },
      ],
    })

    // Extract text content
    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No text content in response' }
    }

    const recommendation = textContent.text

    // Extract priority focus (first line after **Priority Focus**:)
    const priorityMatch = recommendation.match(/\*\*Priority Focus\*\*:\s*(.+?)(?:\n|$)/)
    const priorityFocus = priorityMatch ? priorityMatch[1].trim() : null

    return {
      success: true,
      recommendation,
      priorityFocus: priorityFocus || undefined,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    }
  } catch (error) {
    console.error('Error generating recommendation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function generateAndSaveRecommendation(userId: string): Promise<GenerationResult> {
  const result = await generateRecommendation(userId)

  if (!result.success || !result.recommendation) {
    return result
  }

  const today = new Date().toISOString().split('T')[0]

  try {
    // Upsert recommendation (replace if already exists for today)
    await sql`
      INSERT INTO daily_recommendations (
        user_id,
        date,
        recommendation_text,
        priority_focus,
        model_used,
        input_tokens,
        output_tokens
      ) VALUES (
        ${userId},
        ${today},
        ${result.recommendation},
        ${result.priorityFocus || null},
        'claude-3-haiku-20240307',
        ${result.inputTokens || null},
        ${result.outputTokens || null}
      )
      ON CONFLICT (user_id, date)
      DO UPDATE SET
        recommendation_text = EXCLUDED.recommendation_text,
        priority_focus = EXCLUDED.priority_focus,
        input_tokens = EXCLUDED.input_tokens,
        output_tokens = EXCLUDED.output_tokens,
        generated_at = NOW()
    `

    return result
  } catch (error) {
    console.error('Error saving recommendation:', error)
    return {
      ...result,
      success: false,
      error: 'Generated but failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'),
    }
  }
}

export async function getTodayRecommendation(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const result = await sql`
    SELECT
      id,
      recommendation_text,
      priority_focus,
      generated_at
    FROM daily_recommendations
    WHERE user_id = ${userId}
      AND date = ${today}
  `

  return result[0] || null
}
