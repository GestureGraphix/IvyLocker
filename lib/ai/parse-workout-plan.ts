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

const SYSTEM_PROMPT = `You are a workout plan parser for a track & field team management app.

Parse the training plan text into structured JSON. These plans often have TWO sections:
1. A "Practice Schedule" header with times for different event groups
2. A "Training Plan" section with detailed exercises per day

Rules:
1. Identify days of the week as top-level sections (Monday, Tuesday, etc.)
2. Identify session types:
   - "Lift" or "Lifting" = "lift"
   - "Meet" or "Competition" or event names like "Dr. Sander Scorcher" = "competition"
   - "Pre-meet" = "practice" with title "Pre-meet"
   - "On your own" = "optional" with isOptional: true
   - "Off" = mark isOffDay: true
   - Default = "practice"
3. Detect group-specific workouts. Groups can appear as:
   - Event abbreviations: "LS:", "SS:", "100H:", "LJ:", "TJ:", "PV:", "HJ:"
   - Full names: "Long Sprints:", "Sprints:", "Hurdles:", "Jumps:"
   - Patterns like "Sprinters do X" or "for hurdlers"
   - Named athletes: "Camden/Garon:", "Graham/Sophie:" - treat as "named-athletes" group
   - Conditional: "Friday competitors:", "non-competitors:" - use "competitors" or "non-competitors"
4. Extract times from the schedule section (e.g., "12:00", "4:30 PM", "3:30 and 4:00")
5. Extract locations (e.g., "PWG", "The Armory", "at the track")
6. Parse complex exercise notation:
   - "2x20m 2pt" = 2 reps of 20m with 2-point start
   - "3x MJ 2B" = 3 reps of multi-jump pattern 2B
   - "5x200m 92% 7mR" = 5x200m at 92% with 7min rest
   - Keep the original notation in details for accuracy

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
          "startTime": "16:00",
          "endTime": null,
          "location": "PWG",
          "isOptional": false,
          "forGroups": null,
          "exercises": [
            {
              "name": "Warmup",
              "details": "SD 2, flat and spike strides",
              "forGroups": null
            },
            {
              "name": "Starts",
              "details": "2x20m 2pt, 2x30m 3pt/4pt sleds",
              "forGroups": ["sprints"]
            },
            {
              "name": "Blocks",
              "details": "1x25m 1x25/25m blocks curve",
              "forGroups": ["400m"]
            }
          ]
        },
        {
          "type": "lift",
          "title": "Lift",
          "startTime": "18:30",
          "endTime": null,
          "location": "PWG",
          "isOptional": false,
          "forGroups": null,
          "exercises": []
        }
      ]
    },
    {
      "dayOfWeek": "saturday",
      "isOffDay": false,
      "sessions": [
        {
          "type": "competition",
          "title": "Dr. Sander Scorcher",
          "startTime": null,
          "endTime": null,
          "location": "The Armory",
          "isOptional": false,
          "forGroups": null,
          "exercises": []
        }
      ]
    }
  ],
  "detectedGroups": ["sprints", "long-sprints", "100h", "jumps", "multi"],
  "scheduleInfo": {
    "practiceTime": "varies by group",
    "liftTime": "3:30 and 4:00",
    "location": "PWG"
  }
}

Group slug conventions (lowercase with hyphens):
- "SS" or "Short Sprints" or "Sprints" → "sprints" or "short-sprints"
- "LS" or "Long Sprints" → "long-sprints"
- "100H" or "Hurdles" or "Hurdlers" → "100h" or "hurdles"
- "LJ" or "Long Jump" → "long-jump"
- "TJ" or "Triple Jump" → "triple-jump"
- "LJ/TJ" → use ["long-jump", "triple-jump"]
- "PV" or "Pole Vault" → "pole-vault"
- "HJ" or "High Jump" → "high-jump"
- "Jumps" or "Jumpers" → "jumps"
- "Throws" or "Throwers" → "throws"
- "Distance" → "distance"
- "Multi" or "Multis" → "multi"
- "400m competitors" → "400m"
- "200m competitors" → "200m"
- "60m competitors" → "60m"
- Named athletes like "Camden/Garon" → keep as "Camden/Garon" in forGroups

If forGroups is null, it means the exercise/session applies to all athletes.
If a day is not mentioned, don't include it in the output.
For multi-part exercises (warmup items, multiple drills), combine them into one exercise with details.`

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
      max_tokens: 4000,
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
