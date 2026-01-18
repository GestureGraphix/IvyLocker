import Anthropic from '@anthropic-ai/sdk'

export interface ParsedExercise {
  name: string
  details: string | null
  forGroups: string[] | null // null means all groups
}

export interface ParsedSession {
  type: 'practice' | 'lift' | 'conditioning' | 'recovery' | 'competition' | 'optional'
  title: string | null
  startTime: string | null // "16:45" format
  endTime: string | null
  location: string | null
  isOptional: boolean
  forGroups: string[] | null // null means all groups
  exercises: ParsedExercise[]
}

export interface ParsedDay {
  dayOfWeek: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
  isOffDay: boolean
  sessions: ParsedSession[]
}

export interface ParsedPlan {
  days: ParsedDay[]
  detectedGroups: string[] // Groups mentioned in the plan
  scheduleInfo: {
    practiceTime?: string
    liftTime?: string
    location?: string
  } | null
}

export interface ParseResult {
  success: boolean
  plan?: ParsedPlan
  error?: string
  inputTokens?: number
  outputTokens?: number
}

const SYSTEM_PROMPT = `You are a workout plan parser for a sports team management app.

Parse the following training plan text into a structured JSON format.

Rules:
1. Identify days of the week as top-level sections (Monday, Tuesday, etc.)
2. Identify session types:
   - "Lift" or "Lifting" = "lift"
   - "Optional" anything = "optional" with isOptional: true
   - Default = "practice"
3. Detect group-specific workouts by looking for patterns like:
   - "LS:" or "Long Sprints:" → group slug: "long-sprints"
   - "SS:" or "Short Sprints:" → group slug: "short-sprints"
   - "Jumps:" → group slug: "jumps"
   - "Hurdles:" or "(hurdlers do X)" → group slug: "hurdles"
   - "Distance:" → group slug: "distance"
   - "Throws:" → group slug: "throws"
4. Extract times if present (e.g., "4:45-5:45" or "4:30pm")
5. Mark off days (e.g., "Wednesday: Off" or just "Off")
6. Extract locations if mentioned (e.g., "in PWG", "at the track")
7. For group-specific exercises within a session, set forGroups on the exercise level

Output ONLY valid JSON in this exact format, no explanation:
{
  "days": [
    {
      "dayOfWeek": "monday",
      "isOffDay": false,
      "sessions": [
        {
          "type": "practice",
          "title": null,
          "startTime": "16:45",
          "endTime": "17:45",
          "location": null,
          "isOptional": false,
          "forGroups": null,
          "exercises": [
            {
              "name": "Warmup, SD 1, flat strides",
              "details": null,
              "forGroups": null
            },
            {
              "name": "Speed Work",
              "details": "5x200m 84% 5m rest (25.0-26.2)",
              "forGroups": ["long-sprints"]
            }
          ]
        }
      ]
    }
  ],
  "detectedGroups": ["long-sprints", "short-sprints", "jumps"],
  "scheduleInfo": {
    "practiceTime": "4:45-5:45",
    "liftTime": "6:30-7:30",
    "location": "PWG"
  }
}

Group slug conventions:
- Use lowercase with hyphens
- "SS" or "Short Sprints" → "short-sprints"
- "LS" or "Long Sprints" → "long-sprints"
- "Hurdles" or "Hurdlers" → "hurdles"
- "Jumps" or "Jumpers" → "jumps"
- "Throws" or "Throwers" → "throws"
- "Distance" → "distance"
- "Multi" or "Multis" → "multi"

If forGroups is null, it means the exercise/session applies to all athletes.
If a day is not mentioned, don't include it in the output.`

export async function parseWorkoutPlan(planText: string): Promise<ParseResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured' }
  }

  if (!planText.trim()) {
    return { success: false, error: 'No plan text provided' }
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Parse this training plan:\n\n${planText}`,
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { success: false, error: 'No text content in response' }
    }

    // Parse the JSON response
    let plan: ParsedPlan
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      plan = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text)
      return { success: false, error: 'Failed to parse AI response as JSON' }
    }

    // Validate the structure
    if (!plan.days || !Array.isArray(plan.days)) {
      return { success: false, error: 'Invalid plan structure: missing days array' }
    }

    return {
      success: true,
      plan,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    }
  } catch (error) {
    console.error('Parse workout plan error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Helper to convert day name to number (0 = Sunday)
export function dayNameToNumber(day: string): number {
  const days: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }
  return days[day.toLowerCase()] ?? 0
}

// Helper to get the date for a specific day of the week
export function getDateForDayOfWeek(weekStartDate: Date, dayOfWeek: number): Date {
  const date = new Date(weekStartDate)
  const currentDay = date.getDay()
  const diff = dayOfWeek - currentDay
  date.setDate(date.getDate() + diff)
  return date
}
