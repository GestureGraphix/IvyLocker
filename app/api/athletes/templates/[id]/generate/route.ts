import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

interface SetData {
  reps: number
  weight?: number
  rpe?: number
}

interface ExerciseData {
  id: string
  name: string
  notes?: string
  sets: SetData[]
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const weeksAhead = body.weeks || 4 // Default to 4 weeks

    // Get template with schedule
    const templateResult = await sql`
      SELECT t.*, ts.enabled, ts.weekdays, ts.start_time, ts.end_date
      FROM training_templates t
      LEFT JOIN template_schedules ts ON ts.template_id = t.id
      WHERE t.id = ${id} AND t.user_id = ${user.id}
    `

    if (templateResult.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = templateResult[0]

    if (!template.enabled || !template.weekdays || template.weekdays.length === 0) {
      return NextResponse.json({ error: "Template has no active schedule" }, { status: 400 })
    }

    // Get template exercises
    const exercises = await sql`
      SELECT * FROM template_exercises
      WHERE template_id = ${id}
      ORDER BY sort_order
    `

    const exerciseIds = exercises.map((e: { id: string }) => e.id)
    let templateSets: (SetData & { exercise_id: string })[] = []
    if (exerciseIds.length > 0) {
      templateSets = await sql`
        SELECT * FROM template_sets
        WHERE exercise_id = ANY(${exerciseIds})
        ORDER BY exercise_id, sort_order
      `
    }

    // Build exercises with sets
    const exercisesWithSets: ExerciseData[] = exercises.map((exercise: ExerciseData) => ({
      ...exercise,
      sets: templateSets
        .filter((s) => s.exercise_id === exercise.id)
        .map(({ reps, weight, rpe }) => ({ reps, weight, rpe }))
    }))

    // Calculate dates to generate
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endDate = template.end_date ? new Date(template.end_date) : null
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + weeksAhead * 7)

    const scheduleDates: Date[] = []
    const currentDate = new Date(today)

    while (currentDate <= maxDate) {
      // Check if we're past the end date
      if (endDate && currentDate > endDate) {
        break
      }

      // Check if this day matches the schedule (getDay() returns 0=Sun, 1=Mon, etc.)
      if (template.weekdays.includes(currentDate.getDay())) {
        scheduleDates.push(new Date(currentDate))
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (scheduleDates.length === 0) {
      return NextResponse.json({ message: "No sessions to generate", created: [] })
    }

    // Check for existing sessions to avoid duplicates
    const dateStrings = scheduleDates.map(d => d.toISOString().split('T')[0])

    const existingSessions = await sql`
      SELECT scheduled_date FROM sessions
      WHERE user_id = ${user.id}
        AND template_id = ${id}
        AND scheduled_date = ANY(${dateStrings}::date[])
    `

    const existingDates = new Set(
      existingSessions.map((s: { scheduled_date: string }) =>
        new Date(s.scheduled_date).toISOString().split('T')[0]
      )
    )

    // Filter out dates that already have sessions
    const newDates = scheduleDates.filter(d =>
      !existingDates.has(d.toISOString().split('T')[0])
    )

    if (newDates.length === 0) {
      return NextResponse.json({ message: "All sessions already exist", created: [] })
    }

    // Parse start time
    const [hours, minutes] = template.start_time.split(':').map(Number)

    const createdSessions = []

    for (const date of newDates) {
      // Create start and end timestamps
      const startAt = new Date(date)
      startAt.setHours(hours, minutes, 0, 0)

      const endAt = new Date(startAt)
      endAt.setMinutes(endAt.getMinutes() + (template.duration_minutes || 60))

      const scheduledDate = date.toISOString().split('T')[0]

      // Create the session
      const sessionResult = await sql`
        INSERT INTO sessions (user_id, title, type, start_at, end_at, intensity, focus, notes, template_id, scheduled_date)
        VALUES (
          ${user.id},
          ${template.name},
          ${template.type},
          ${startAt.toISOString()},
          ${endAt.toISOString()},
          ${template.intensity},
          ${template.focus},
          ${template.notes},
          ${id},
          ${scheduledDate}
        )
        RETURNING *
      `

      const session = sessionResult[0]

      // Copy exercises and sets
      const createdExercises: ExerciseData[] = []

      for (let i = 0; i < exercisesWithSets.length; i++) {
        const exercise = exercisesWithSets[i]

        const exerciseResult = await sql`
          INSERT INTO session_exercises (session_id, name, notes, sort_order)
          VALUES (${session.id}, ${exercise.name}, ${exercise.notes || null}, ${i})
          RETURNING *
        `

        const createdExercise = { ...exerciseResult[0], sets: [] as SetData[] }

        for (let j = 0; j < exercise.sets.length; j++) {
          const set = exercise.sets[j]

          const setResult = await sql`
            INSERT INTO session_sets (exercise_id, reps, weight, rpe, completed, sort_order)
            VALUES (${createdExercise.id}, ${set.reps}, ${set.weight || null}, ${set.rpe || null}, false, ${j})
            RETURNING *
          `

          createdExercise.sets.push(setResult[0])
        }

        createdExercises.push(createdExercise)
      }

      createdSessions.push({ ...session, exercises: createdExercises })
    }

    return NextResponse.json({
      message: `Created ${createdSessions.length} sessions`,
      created: createdSessions
    }, { status: 201 })
  } catch (error) {
    console.error("Generate sessions error:", error)
    return NextResponse.json({ error: "Failed to generate sessions" }, { status: 500 })
  }
}
