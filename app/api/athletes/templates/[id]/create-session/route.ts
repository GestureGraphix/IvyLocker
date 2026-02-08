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
    const { date, start_time, timezoneOffset = 0 } = body

    // Get template
    const templateResult = await sql`
      SELECT * FROM training_templates
      WHERE id = ${id} AND user_id = ${user.id}
    `

    if (templateResult.length === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const template = templateResult[0]

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

    // Calculate timestamps
    const sessionDate = date ? new Date(date) : new Date()
    const [hours, minutes] = (start_time || "09:00").split(':').map(Number)

    const startAt = new Date(sessionDate)
    startAt.setUTCHours(hours, minutes, 0, 0)
    startAt.setUTCMinutes(startAt.getUTCMinutes() + timezoneOffset)

    const endAt = new Date(startAt)
    endAt.setMinutes(endAt.getMinutes() + (template.duration_minutes || 60))

    // Create the session (without template_id or scheduled_date - this is a manual copy)
    const sessionResult = await sql`
      INSERT INTO sessions (user_id, title, type, start_at, end_at, intensity, focus, notes)
      VALUES (
        ${user.id},
        ${template.name},
        ${template.type},
        ${startAt.toISOString()},
        ${endAt.toISOString()},
        ${template.intensity},
        ${template.focus},
        ${template.notes}
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

    return NextResponse.json({
      session: { ...session, exercises: createdExercises }
    }, { status: 201 })
  } catch (error) {
    console.error("Create session from template error:", error)
    return NextResponse.json({ error: "Failed to create session from template" }, { status: 500 })
  }
}
