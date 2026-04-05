import Anthropic from '@anthropic-ai/sdk'

export interface ParsedExercise {
  name: string
  details: string | null
  forGroups: string[] | null // null means all groups
}

export interface ParsedSession {
  type: 'practice' | 'lift' | 'conditioning' | 'recovery' | 'competition' | 'optional' | 'video' | 'travel' | 'meeting' | 'skills'
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

export interface ParseInput {
  text?: string
  image?: {
    base64: string
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }
}

const SYSTEM_PROMPT = `You are a workout plan parser for a multi-sport athlete management app.

Parse the training plan (text or image) into structured JSON. Plans come from many sports — track & field, rowing/crew, lacrosse, hockey, soccer, basketball, etc. Detect the sport from context and adapt your parsing accordingly.

Rules:

1. **Days**: Identify days of the week as top-level sections (Monday-Sunday). If only one day is shown (e.g., a single practice plan), output just that day. If a grid/spreadsheet shows a full week, output all days.

2. **Session types** — map activities to these types:
   - "practice" — practice, drills, on-water, on-ice, field sessions, ERG sessions
   - "lift" — lifting, weights, strength training
   - "conditioning" — conditioning, cardio, tempo runs, intervals (when not sport-specific practice)
   - "recovery" — recovery, treatment, physio, mobility, stretching, cooldown sessions
   - "competition" — games, matches, meets, races, competitions, scrimmages
   - "optional" — anything marked optional, "on your own"
   - "video" — film sessions, video review, film breakdown
   - "travel" — team travel, departure, transit
   - "meeting" — team meetings, pregame meetings, pregame meal, chalk talk
   - "skills" — sport-specific skills sessions (skills ice, stick skills, shooting drills when separate from practice)
   - "Off" days → set isOffDay: true

3. **Groups/positions**: Detect group or position structures from the content. Use lowercase-hyphenated slugs.
   - Track & field: "sprints", "long-sprints", "hurdles", "jumps", "long-jump", "triple-jump", "pole-vault", "high-jump", "throws", "distance", "multi"
   - Common abbreviations: SS→"sprints", LS→"long-sprints", LJ→"long-jump", TJ→"triple-jump", PV→"pole-vault", HJ→"high-jump"
   - Rowing/crew: "heavyweight", "lightweight", "varsity-8", "jv-8", etc.
   - Team sports: "attack", "defense", "midfield", "goalkeepers", "forwards", etc.
   - Generic groups: "group-1", "group-2", "starters", "reserves", etc.
   - Lift groups: "lift-group-1", "lift-group-2", "am-lift"
   - Named athletes: keep as-is (e.g., "Camden/Garon")
   - Conditional: "competitors", "non-competitors"
   - If forGroups is null, it means the exercise/session applies to all athletes.

4. **Times**: Extract times in "HH:MM" 24-hour format. Convert AM/PM to 24-hour (e.g., "5:00 PM" → "17:00", "630AM" → "06:30").

5. **Locations**: Extract locations (e.g., "PWG", "The Armory", "CF", "Gilder Center", "Ingalls Rink").

6. **Exercises/activities**: Preserve original notation in the details field.
   - Track: "5x200m 92% 7mR", "2x20m 2pt"
   - Rowing: "2x7km U3", "Steady with bursts", "ERG U3 14km"
   - Team sports: drills by name with duration, player assignments
   - Generic: exercise name + any specifications

7. **Image parsing**: When analyzing an image of a workout plan:
   - Extract ALL visible text faithfully
   - Respect grid/table layouts — rows and columns encode structure (days, AM/PM, session fields)
   - Color coding often indicates session types or intensity levels
   - Spreadsheet headers define the data structure
   - Read every cell, even partially visible ones

Output ONLY valid JSON in this exact format, no explanation:
{
  "days": [
    {
      "dayOfWeek": "monday",
      "isOffDay": false,
      "sessions": [
        {
          "type": "practice",
          "title": "AM Practice",
          "startTime": "07:45",
          "endTime": null,
          "location": "PWG",
          "isOptional": false,
          "forGroups": null,
          "exercises": [
            {
              "name": "Warmup",
              "details": "15 min dynamic warmup",
              "forGroups": null
            }
          ]
        }
      ]
    }
  ],
  "detectedGroups": ["attack", "defense", "midfield"],
  "scheduleInfo": {
    "practiceTime": "varies",
    "liftTime": "3:30 PM",
    "location": "PWG"
  }
}

If a day is not mentioned, don't include it in the output.
For multi-part exercises (warmup items, multiple drills), combine them into one exercise with details.
If schedule info isn't clear, set scheduleInfo to null.`

export async function parseWorkoutPlan(input: ParseInput): Promise<ParseResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'ANTHROPIC_API_KEY not configured' }
  }

  if (!input.text?.trim() && !input.image) {
    return { success: false, error: 'No plan text or image provided' }
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Use Sonnet for image inputs (better spatial reasoning), Haiku for text
    const model = input.image ? 'claude-sonnet-4-20250514' : 'claude-3-haiku-20240307'
    const maxTokens = input.image ? 8000 : 4000

    // Build content array
    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

    if (input.image) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: input.image.mediaType,
          data: input.image.base64,
        },
      })
    }

    const textPrompt = input.text?.trim()
      ? `Parse this training plan:\n\n${input.text}`
      : 'Parse the workout plan shown in this image into structured JSON.'

    content.push({
      type: 'text',
      text: textPrompt,
    })

    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content,
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
