import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/athletes/sessions/history - Get completed sessions
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ sessions: [] })
    }

    const { searchParams } = new URL(request.url)
    const daysBack = parseInt(searchParams.get('days') || '30')

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Get completed sessions for the user within date range
    const sessions = await sql`
      SELECT * FROM sessions
      WHERE user_id = ${user.id}
        AND completed = true
        AND start_at >= ${startDate.toISOString()}
        AND start_at <= ${endDate.toISOString()}
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
    console.error("Get sessions history error:", error)
    return NextResponse.json({ error: "Failed to get sessions history" }, { status: 500 })
  }
}
