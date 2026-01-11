import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

interface SetInput {
  reps: number
  weight?: number
  rpe?: number
}

interface SetRecord extends SetInput {
  id: string
  exercise_id: string
  sort_order: number
}

interface ExerciseInput {
  name: string
  notes?: string
  sets: SetInput[]
}

interface ExerciseRecord {
  id: string
  template_id: string
  name: string
  notes?: string
  sort_order: number
}

interface ScheduleInput {
  enabled: boolean
  weekdays: number[]
  start_time: string
  end_date?: string
}

interface TemplateRecord {
  id: string
  user_id: string
  name: string
  type: string
  duration_minutes: number
  intensity: string
  focus?: string
  notes?: string
}

interface ScheduleRecord {
  id: string
  template_id: string
  enabled: boolean
  weekdays: number[]
  start_time: string
  end_date?: string
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await sql`
      SELECT * FROM training_templates
      WHERE id = ${id} AND user_id = ${user.id}
    ` as TemplateRecord[]

    if (result.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = result[0]

    // Get schedule
    const scheduleResult = await sql`
      SELECT * FROM template_schedules
      WHERE template_id = ${id}
    ` as ScheduleRecord[]

    // Get exercises
    const exercises = await sql`
      SELECT * FROM template_exercises
      WHERE template_id = ${id}
      ORDER BY sort_order
    ` as ExerciseRecord[]

    const exerciseIds = exercises.map((e) => e.id)
    let sets: SetRecord[] = []
    if (exerciseIds.length > 0) {
      sets = await sql`
        SELECT * FROM template_sets
        WHERE exercise_id = ANY(${exerciseIds})
        ORDER BY exercise_id, sort_order
      ` as SetRecord[]
    }

    const exercisesWithSets = exercises.map((exercise) => ({
      ...exercise,
      sets: sets.filter((s) => s.exercise_id === exercise.id)
    }))

    return NextResponse.json({
      template: {
        ...template,
        schedule: scheduleResult[0] || null,
        exercises: exercisesWithSets
      }
    })
  } catch (error) {
    console.error("Get template error:", error)
    return NextResponse.json({ error: "Failed to get template" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const result = await sql`
      UPDATE training_templates
      SET
        name = COALESCE(${body.name ?? null}, name),
        type = COALESCE(${body.type ?? null}, type),
        duration_minutes = COALESCE(${body.duration_minutes ?? null}, duration_minutes),
        intensity = COALESCE(${body.intensity ?? null}, intensity),
        focus = COALESCE(${body.focus ?? null}, focus),
        notes = COALESCE(${body.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    ` as TemplateRecord[]

    if (result.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = result[0]

    // Handle exercises update if provided
    if (body.exercises !== undefined) {
      await sql`DELETE FROM template_exercises WHERE template_id = ${id}`

      if (body.exercises && Array.isArray(body.exercises)) {
        for (let i = 0; i < body.exercises.length; i++) {
          const exercise: ExerciseInput = body.exercises[i]

          const exerciseResult = await sql`
            INSERT INTO template_exercises (template_id, name, notes, sort_order)
            VALUES (${id}, ${exercise.name}, ${exercise.notes || null}, ${i})
            RETURNING *
          ` as ExerciseRecord[]

          if (exercise.sets && Array.isArray(exercise.sets)) {
            for (let j = 0; j < exercise.sets.length; j++) {
              const set = exercise.sets[j]

              await sql`
                INSERT INTO template_sets (exercise_id, reps, weight, rpe, sort_order)
                VALUES (${exerciseResult[0].id}, ${set.reps}, ${set.weight || null}, ${set.rpe || null}, ${j})
              `
            }
          }
        }
      }
    }

    // Handle schedule update if provided
    if (body.schedule !== undefined) {
      await sql`DELETE FROM template_schedules WHERE template_id = ${id}`

      if (body.schedule) {
        const scheduleInput: ScheduleInput = body.schedule
        await sql`
          INSERT INTO template_schedules (template_id, enabled, weekdays, start_time, end_date)
          VALUES (${id}, ${scheduleInput.enabled}, ${scheduleInput.weekdays}, ${scheduleInput.start_time}, ${scheduleInput.end_date || null})
        `
      }
    }

    // Fetch updated data
    const scheduleResult = await sql`
      SELECT * FROM template_schedules WHERE template_id = ${id}
    ` as ScheduleRecord[]

    const exercises = await sql`
      SELECT * FROM template_exercises WHERE template_id = ${id} ORDER BY sort_order
    ` as ExerciseRecord[]

    const exerciseIds = exercises.map((e) => e.id)
    let sets: SetRecord[] = []
    if (exerciseIds.length > 0) {
      sets = await sql`
        SELECT * FROM template_sets
        WHERE exercise_id = ANY(${exerciseIds})
        ORDER BY exercise_id, sort_order
      ` as SetRecord[]
    }

    const exercisesWithSets = exercises.map((exercise) => ({
      ...exercise,
      sets: sets.filter((s) => s.exercise_id === exercise.id)
    }))

    return NextResponse.json({
      template: {
        ...template,
        schedule: scheduleResult[0] || null,
        exercises: exercisesWithSets
      }
    })
  } catch (error) {
    console.error("Update template error:", error)
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    const { id } = await params

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await sql`
      DELETE FROM training_templates
      WHERE id = ${id} AND user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete template error:", error)
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
  }
}
