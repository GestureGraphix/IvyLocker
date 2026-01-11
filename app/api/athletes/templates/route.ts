import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

interface SetInput {
  reps: number
  weight?: number
  rpe?: number
}

interface ExerciseInput {
  name: string
  notes?: string
  sets: SetInput[]
}

interface ScheduleInput {
  enabled: boolean
  weekdays: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string // HH:MM format
  end_date?: string // YYYY-MM-DD format
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ templates: [] })
    }

    // Get all templates for the user
    const templates = await sql`
      SELECT * FROM training_templates
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `

    if (templates.length === 0) {
      return NextResponse.json({ templates: [] })
    }

    const templateIds = templates.map((t: { id: string }) => t.id)

    // Get schedules
    const schedules = await sql`
      SELECT * FROM template_schedules
      WHERE template_id = ANY(${templateIds})
    `

    // Get exercises
    const exercises = await sql`
      SELECT * FROM template_exercises
      WHERE template_id = ANY(${templateIds})
      ORDER BY template_id, sort_order
    `

    const exerciseIds = exercises.map((e: { id: string }) => e.id)

    let sets: { id: string; exercise_id: string; reps: number; weight?: number; rpe?: number; sort_order: number }[] = []
    if (exerciseIds.length > 0) {
      sets = await sql`
        SELECT * FROM template_sets
        WHERE exercise_id = ANY(${exerciseIds})
        ORDER BY exercise_id, sort_order
      `
    }

    // Build nested structure
    const scheduleMap = new Map<string, object>()
    for (const schedule of schedules) {
      scheduleMap.set(schedule.template_id, schedule)
    }

    const exerciseMap = new Map<string, typeof exercises[0] & { sets: typeof sets }>()
    for (const exercise of exercises) {
      exerciseMap.set(exercise.id, { ...exercise, sets: [] })
    }

    for (const set of sets) {
      const exercise = exerciseMap.get(set.exercise_id)
      if (exercise) {
        exercise.sets.push(set)
      }
    }

    const templatesWithData = templates.map((template: { id: string }) => ({
      ...template,
      schedule: scheduleMap.get(template.id) || null,
      exercises: exercises
        .filter((e: { template_id: string }) => e.template_id === template.id)
        .map((e: { id: string }) => exerciseMap.get(e.id))
    }))

    return NextResponse.json({ templates: templatesWithData })
  } catch (error) {
    console.error("Get templates error:", error)
    return NextResponse.json({ error: "Failed to get templates" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, type, duration_minutes, intensity, focus, notes, exercises, schedule } = await request.json()

    // Create the template
    const result = await sql`
      INSERT INTO training_templates (user_id, name, type, duration_minutes, intensity, focus, notes)
      VALUES (${user.id}, ${name}, ${type}, ${duration_minutes || 60}, ${intensity || null}, ${focus || null}, ${notes || null})
      RETURNING *
    `

    const template = result[0]
    const createdExercises: (ExerciseInput & { sets: SetInput[] })[] = []

    // Create exercises and sets if provided
    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const exercise: ExerciseInput = exercises[i]

        const exerciseResult = await sql`
          INSERT INTO template_exercises (template_id, name, notes, sort_order)
          VALUES (${template.id}, ${exercise.name}, ${exercise.notes || null}, ${i})
          RETURNING *
        `

        const createdExercise = { ...exerciseResult[0], sets: [] as SetInput[] }

        if (exercise.sets && Array.isArray(exercise.sets)) {
          for (let j = 0; j < exercise.sets.length; j++) {
            const set = exercise.sets[j]

            const setResult = await sql`
              INSERT INTO template_sets (exercise_id, reps, weight, rpe, sort_order)
              VALUES (${createdExercise.id}, ${set.reps}, ${set.weight || null}, ${set.rpe || null}, ${j})
              RETURNING *
            `

            createdExercise.sets.push(setResult[0])
          }
        }

        createdExercises.push(createdExercise)
      }
    }

    // Create schedule if provided
    let createdSchedule = null
    if (schedule) {
      const scheduleInput: ScheduleInput = schedule
      const scheduleResult = await sql`
        INSERT INTO template_schedules (template_id, enabled, weekdays, start_time, end_date)
        VALUES (${template.id}, ${scheduleInput.enabled}, ${scheduleInput.weekdays}, ${scheduleInput.start_time}, ${scheduleInput.end_date || null})
        RETURNING *
      `
      createdSchedule = scheduleResult[0]
    }

    return NextResponse.json({
      template: { ...template, exercises: createdExercises, schedule: createdSchedule }
    }, { status: 201 })
  } catch (error) {
    console.error("Create template error:", error)
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }
}
