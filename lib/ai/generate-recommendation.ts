import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
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

CRITICAL: If a dining hall menu is provided, you MUST recommend specific foods from that menu by name. Do NOT give generic advice like "eat a balanced meal" — instead say exactly which items to pick (e.g., "At lunch, grab the Grilled Chicken and Brown Rice for 45g protein"). Build actual plate recommendations from the available menu items to hit their macro goals.

If information is missing, say so and recommend they log data. Do NOT invent or assume assignments, courses, workouts, or meals that aren't explicitly listed in the data. Only reference what is provided — if there are no assignments, do not mention any. If there are no meals logged, say to start tracking.

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

Keep the total response under 400 words. Be direct and practical.`

export interface GenerationResult {
  success: boolean
  recommendation?: string
  priorityFocus?: string
  inputTokens?: number
  outputTokens?: number
  error?: string
}

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BEDROCK_MODEL = 'anthropic.claude-3-haiku-20240307-v1:0'

export async function generateRecommendation(userId: string): Promise<GenerationResult> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return { success: false, error: 'AWS credentials not configured' }
  }

  try {
    const athleteData = await gatherAthleteData(userId)
    const formattedData = formatAthleteDataForPrompt(athleteData)

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: formattedData }],
    })

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: BEDROCK_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    }))

    const result = JSON.parse(new TextDecoder().decode(response.body))

    const recommendation = result.content?.[0]?.text
    if (!recommendation) {
      return { success: false, error: 'No text content in response' }
    }

    const priorityMatch = recommendation.match(/\*\*Priority Focus\*\*:\s*(.+?)(?:\n|$)/)
    const priorityFocus = priorityMatch ? priorityMatch[1].trim() : null

    return {
      success: true,
      recommendation,
      priorityFocus: priorityFocus || undefined,
      inputTokens: result.usage?.input_tokens,
      outputTokens: result.usage?.output_tokens,
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
        BEDROCK_MODEL,
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
