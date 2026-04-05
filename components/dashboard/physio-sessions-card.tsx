"use client"

import { useState } from "react"
import { Stethoscope, ChevronRight, Check } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ExerciseData {
  id: string
  name: string
  sets: number | null
  reps: string | null
  hold_seconds: number | null
  duration_seconds: number | null
  side: string | null
  notes: string | null
  sort_order: number
  completed: boolean
  completed_at: string | null
  pain_level: number | null
  athlete_notes: string | null
}

interface SessionData {
  session_id: string
  session_date: string
  session_title: string | null
  session_notes: string | null
  program_id: string
  program_title: string
  program_type: "prehab" | "rehab"
  physio_name: string
  session_completion_id: string | null
  session_completed_at: string | null
  perceived_effort: number | null
  exercises: ExerciseData[]
}

// Also fetch old-style assignments as fallback
interface OldAssignment {
  id: string
  title: string
  type: "prehab" | "rehab"
  exercises: { name: string; sets?: string; reps?: string; notes?: string }[]
  frequency?: string
  duration_weeks?: number
  description?: string
  physio_name: string
}

export function PhysioSessionsCard() {
  const today = new Date().toISOString().split("T")[0]
  const { data: sessionsData, mutate } = useSWR(`/api/athletes/physio-sessions?date=${today}`, fetcher)
  const { data: assignmentsData } = useSWR("/api/athletes/physio-assignments", fetcher)

  const sessions: SessionData[] = sessionsData?.sessions || []
  const oldAssignments: OldAssignment[] = assignmentsData?.assignments || []

  // Show nothing if no data at all
  if (sessions.length === 0 && oldAssignments.length === 0) return null

  return (
    <div
      className="bg-white overflow-hidden"
      style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
    >
      <div
        className="flex items-center gap-2 px-[18px] py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <Stethoscope className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
        <span
          className="uppercase"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "2px",
            color: "var(--muted)",
          }}
        >
          {sessions.length > 0 ? "Today's Physio" : "Physio Protocols"}
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--rule)" }}>
        {/* New structured sessions */}
        {sessions.map((session) => (
          <SessionRow key={session.session_id} session={session} onUpdate={mutate} />
        ))}
        {/* Fallback: old-style assignments (only if no structured sessions) */}
        {sessions.length === 0 &&
          oldAssignments.map((a) => <OldAssignmentRow key={a.id} assignment={a} />)}
      </div>
    </div>
  )
}

function SessionRow({
  session,
  onUpdate,
}: {
  session: SessionData
  onUpdate: () => void
}) {
  const [expanded, setExpanded] = useState(true) // default open for today
  const [completing, setCompleting] = useState<string | null>(null)

  const totalExercises = session.exercises.length
  const completedExercises = session.exercises.filter((e) => e.completed).length
  const allDone = totalExercises > 0 && completedExercises === totalExercises
  const sessionDone = !!session.session_completion_id

  const typeColor = session.program_type === "rehab" ? "#f97316" : "#a78bfa"

  async function toggleExercise(exerciseId: string, currentlyCompleted: boolean) {
    setCompleting(exerciseId)
    try {
      const url = `/api/athletes/physio-sessions/${session.session_id}/exercises/${exerciseId}/complete`
      const res = await fetch(url, {
        method: currentlyCompleted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: currentlyCompleted ? undefined : JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      onUpdate()
    } catch {
      toast.error("Failed to update exercise")
    } finally {
      setCompleting(null)
    }
  }

  async function toggleSession() {
    try {
      const url = `/api/athletes/physio-sessions/${session.session_id}/complete`
      const res = await fetch(url, {
        method: sessionDone ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: sessionDone ? undefined : JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      onUpdate()
      if (!sessionDone) toast.success("Session complete!")
    } catch {
      toast.error("Failed to update session")
    }
  }

  return (
    <div>
      <button
        className="w-full flex items-center justify-between px-[18px] py-3 text-left transition-colors hover:bg-[var(--cream-d)]"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="px-1.5 py-0.5 rounded text-white flex-shrink-0"
            style={{
              background: typeColor,
              fontFamily: "'DM Mono', monospace",
              fontSize: "7px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {session.program_type}
          </span>
          <div>
            <p
              className="text-sm font-medium"
              style={{
                color: "var(--ink)",
                textDecoration: sessionDone ? "line-through" : "none",
                opacity: sessionDone ? 0.5 : 1,
              }}
            >
              {session.program_title}
              {session.session_title && ` — ${session.session_title}`}
            </p>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                color: "var(--muted)",
                marginTop: "1px",
              }}
            >
              {session.physio_name} · {completedExercises}/{totalExercises} done
            </p>
          </div>
        </div>
        <ChevronRight
          className="h-3.5 w-3.5 flex-shrink-0 ml-2 transition-transform"
          style={{
            color: "var(--muted)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {expanded && (
        <div className="px-[18px] pb-3 space-y-2" style={{ background: "var(--cream-d, #f7f4ef)" }}>
          {session.session_notes && (
            <p style={{ fontSize: "11px", color: "var(--soft)", lineHeight: 1.5, fontStyle: "italic" }}>
              {session.session_notes}
            </p>
          )}

          {/* Exercise checkboxes */}
          <div className="space-y-1.5">
            {session.exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex.id, ex.completed)}
                disabled={completing === ex.id}
                className="w-full flex items-start gap-2.5 text-left group"
              >
                <div
                  className="mt-0.5 h-4 w-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    border: `1.5px solid ${ex.completed ? typeColor : "var(--rule)"}`,
                    background: ex.completed ? typeColor : "transparent",
                  }}
                >
                  {ex.completed && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--ink)",
                        textDecoration: ex.completed ? "line-through" : "none",
                        opacity: ex.completed ? 0.5 : 1,
                      }}
                    >
                      {ex.name}
                    </span>
                    {(ex.sets || ex.reps) && (
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "9px",
                          color: "var(--muted)",
                        }}
                      >
                        {[
                          ex.sets && `${ex.sets}x`,
                          ex.reps,
                          ex.hold_seconds && `${ex.hold_seconds}s hold`,
                          ex.side && `[${ex.side}]`,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    )}
                  </div>
                  {ex.notes && (
                    <p
                      style={{
                        fontSize: "10px",
                        color: "var(--muted)",
                        marginTop: "1px",
                      }}
                    >
                      {ex.notes}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Session complete button */}
          {totalExercises > 0 && (
            <button
              onClick={toggleSession}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                background: sessionDone ? "transparent" : allDone ? typeColor : "var(--rule)",
                color: sessionDone ? "var(--muted)" : allDone ? "#fff" : "var(--ink)",
                border: sessionDone ? `1px solid var(--rule)` : "none",
              }}
            >
              {sessionDone ? (
                <>Completed</>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Mark Session Done
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Fallback for old-style assignments without structured sessions
function OldAssignmentRow({ assignment }: { assignment: OldAssignment }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button
        className="w-full flex items-center justify-between px-[18px] py-3 text-left transition-colors hover:bg-[var(--cream-d)]"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="px-1.5 py-0.5 rounded text-white flex-shrink-0"
            style={{
              background: assignment.type === "rehab" ? "#f97316" : "#a78bfa",
              fontFamily: "'DM Mono', monospace",
              fontSize: "7px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {assignment.type}
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {assignment.title}
            </p>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                color: "var(--muted)",
                marginTop: "1px",
              }}
            >
              {assignment.physio_name}
              {assignment.frequency ? ` · ${assignment.frequency}` : ""}
            </p>
          </div>
        </div>
        <ChevronRight
          className="h-3.5 w-3.5 flex-shrink-0 ml-2 transition-transform"
          style={{
            color: "var(--muted)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {expanded && (
        <div className="px-[18px] pb-3 space-y-2" style={{ background: "var(--cream-d, #f7f4ef)" }}>
          {assignment.description && (
            <p style={{ fontSize: "12px", color: "var(--soft)", lineHeight: 1.6 }}>
              {assignment.description}
            </p>
          )}
          {assignment.exercises?.length > 0 && (
            <div className="space-y-1">
              {assignment.exercises.map((ex, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink)" }}>
                    {ex.name}
                  </span>
                  {(ex.sets || ex.reps) && (
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        color: "var(--muted)",
                      }}
                    >
                      {[ex.sets && `${ex.sets}x`, ex.reps].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
