import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

interface SetInput {
  reps: number
  weight?: number
  rpe?: number
  completed?: boolean
}

interface ExerciseInput {
  name: string
  notes?: string
  sets: SetInput[]
}

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ sessions: [] })
    }

    // Get all sessions for the user
    const sessions = await sql`
      SELECT * FROM sessions
      WHERE user_id = ${user.id}
      ORDER BY start_at DESC
    `

    // Get exercises and sets for all sessions
    const sessionIds = sessions.map((s: { id: string }) => s.id)

    if (sessionIds.length === 0) {
      return NextResponse.json({ sessions: [] })
    }

    const exercises = await sql`
      SELECT * FROM session_exercises
      WHERE session_id = ANY(${sessionIds})
      ORDER BY session_id, sort_order
    `

    const exerciseIds = exercises.map((e: { id: string }) => e.id)

    let sets: { id: string; exercise_id: string; reps: number; weight?: number; rpe?: number; completed: boolean; sort_order: number }[] = []
    if (exerciseIds.length > 0) {
      sets = await sql`
        SELECT * FROM session_sets
        WHERE exercise_id = ANY(${exerciseIds})
        ORDER BY exercise_id, sort_order
      `
    }

    // Build the nested structure
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

    const sessionsWithExercises = sessions.map((session: { id: string }) => ({
      ...session,
      exercises: exercises
        .filter((e: { session_id: string }) => e.session_id === session.id)
        .map((e: { id: string }) => exerciseMap.get(e.id))
    }))

    return NextResponse.json({ sessions: sessionsWithExercises })
  } catch (error) {
    console.error("Get sessions error:", error)
    return NextResponse.json({ error: "Failed to get sessions" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, type, start_at, end_at, intensity, focus, notes, exercises, template_id, scheduled_date } = await request.json()

    // Create the session
    const result = await sql`
      INSERT INTO sessions (user_id, title, type, start_at, end_at, intensity, focus, notes, template_id, scheduled_date)
      VALUES (${user.id}, ${title}, ${type}, ${start_at}, ${end_at}, ${intensity}, ${focus || null}, ${notes || null}, ${template_id || null}, ${scheduled_date || null})
      RETURNING *
    `

    const session = result[0]
    const createdExercises: (typeof exercises[0] & { sets: SetInput[] })[] = []

    // Create exercises and sets if provided
    if (exercises && Array.isArray(exercises)) {
      for (let i = 0; i < exercises.length; i++) {
        const exercise: ExerciseInput = exercises[i]

        const exerciseResult = await sql`
          INSERT INTO session_exercises (session_id, name, notes, sort_order)
          VALUES (${session.id}, ${exercise.name}, ${exercise.notes || null}, ${i})
          RETURNING *
        `

        const createdExercise = { ...exerciseResult[0], sets: [] as SetInput[] }

        // Create sets for this exercise
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

    return NextResponse.json({
      session: { ...session, exercises: createdExercises }
    }, { status: 201 })
  } catch (error) {
    console.error("Create session error:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}
