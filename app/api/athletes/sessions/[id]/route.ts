import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

interface SetInput {
  id?: string
  reps: number
  weight?: number
  rpe?: number
  completed?: boolean
}

interface ExerciseInput {
  id?: string
  name: string
  notes?: string
  sets: SetInput[]
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
      UPDATE sessions
      SET
        completed = COALESCE(${body.completed ?? null}, completed),
        title = COALESCE(${body.title ?? null}, title),
        type = COALESCE(${body.type ?? null}, type),
        start_at = COALESCE(${body.start_at ?? null}, start_at),
        end_at = COALESCE(${body.end_at ?? null}, end_at),
        intensity = COALESCE(${body.intensity ?? null}, intensity),
        focus = COALESCE(${body.focus ?? null}, focus),
        notes = COALESCE(${body.notes ?? null}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${user.id}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    const session = result[0]

    // Handle exercises update if provided
    if (body.exercises !== undefined) {
      // Delete existing exercises (cascades to sets)
      await sql`DELETE FROM session_exercises WHERE session_id = ${id}`

      const createdExercises: (ExerciseInput & { sets: SetInput[] })[] = []

      if (body.exercises && Array.isArray(body.exercises)) {
        for (let i = 0; i < body.exercises.length; i++) {
          const exercise: ExerciseInput = body.exercises[i]

          const exerciseResult = await sql`
            INSERT INTO session_exercises (session_id, name, notes, sort_order)
            VALUES (${id}, ${exercise.name}, ${exercise.notes || null}, ${i})
            RETURNING *
          `

          const createdExercise = { ...exerciseResult[0], sets: [] as SetInput[] }

          if (exercise.sets && Array.isArray(exercise.sets)) {
            for (let j = 0; j < exercise.sets.length; j++) {
              const set = exercise.sets[j]

              const setResult = await sql`
                INSERT INTO session_sets (exercise_id, reps, weight, rpe, completed, sort_order)
                VALUES (${createdExercise.id}, ${set.reps}, ${set.weight || null}, ${set.rpe || null}, ${set.completed || false}, ${j})
                RETURNING *
              `

              createdExercise.sets.push(setResult[0])
            }
          }

          createdExercises.push(createdExercise)
        }
      }

      return NextResponse.json({ session: { ...session, exercises: createdExercises } })
    }

    // Get existing exercises if not updating them
    const exercises = await sql`
      SELECT * FROM session_exercises
      WHERE session_id = ${id}
      ORDER BY sort_order
    `

    const exerciseIds = exercises.map((e: { id: string }) => e.id)
    let sets: SetInput[] = []
    if (exerciseIds.length > 0) {
      sets = await sql`
        SELECT * FROM session_sets
        WHERE exercise_id = ANY(${exerciseIds})
        ORDER BY exercise_id, sort_order
      `
    }

    const exercisesWithSets = exercises.map((exercise: { id: string }) => ({
      ...exercise,
      sets: sets.filter((s: { exercise_id?: string }) => s.exercise_id === exercise.id)
    }))

    return NextResponse.json({ session: { ...session, exercises: exercisesWithSets } })
  } catch (error) {
    console.error("Update session error:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
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
      DELETE FROM sessions
      WHERE id = ${id} AND user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete session error:", error)
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 })
  }
}
