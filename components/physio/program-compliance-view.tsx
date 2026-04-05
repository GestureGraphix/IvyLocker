"use client"

import useSWR from "swr"
import { Check, X, AlertTriangle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ComplianceExercise {
  id: string
  name: string
  completed: boolean
  completed_at: string | null
  pain_level: number | null
  athlete_notes: string | null
}

interface ComplianceSession {
  session_id: string
  session_date: string
  title: string | null
  session_completed: boolean
  session_completed_at: string | null
  perceived_effort: number | null
  session_notes: string | null
  exercises: ComplianceExercise[]
  total_exercises: number
  completed_exercises: number
}

interface ComplianceStats {
  totalSessions: number
  completedSessions: number
  sessionCompliancePercent: number
  totalExercises: number
  completedExercises: number
  exerciseCompliancePercent: number
}

interface ProgramComplianceViewProps {
  programId: string
}

export function ProgramComplianceView({ programId }: ProgramComplianceViewProps) {
  const { data, isLoading } = useSWR<{ sessions: ComplianceSession[]; stats: ComplianceStats }>(
    `/api/physio/programs/${programId}/completions`,
    fetcher
  )

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-2">Loading compliance data...</div>
  }

  if (!data || !data.sessions || data.sessions.length === 0) {
    return <div className="text-xs text-muted-foreground py-2">No sessions yet</div>
  }

  const { sessions, stats } = data

  const complianceColor = (pct: number) =>
    pct >= 80 ? "text-green-500" : pct >= 50 ? "text-yellow-500" : "text-red-400"

  const formatDate = (dateStr: string) => {
    const d = new Date((dateStr || "").slice(0, 10) + "T12:00:00")
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-3 mt-3">
      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-md bg-secondary/30 text-center">
          <p className={`text-lg font-bold ${complianceColor(stats.sessionCompliancePercent)}`}>
            {stats.sessionCompliancePercent}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            Sessions ({stats.completedSessions}/{stats.totalSessions})
          </p>
        </div>
        <div className="p-2 rounded-md bg-secondary/30 text-center">
          <p className={`text-lg font-bold ${complianceColor(stats.exerciseCompliancePercent)}`}>
            {stats.exerciseCompliancePercent}%
          </p>
          <p className="text-[10px] text-muted-foreground">
            Exercises ({stats.completedExercises}/{stats.totalExercises})
          </p>
        </div>
      </div>

      {/* Per-session breakdown */}
      <div className="space-y-1.5">
        {sessions.map((session) => {
          const pct =
            session.total_exercises > 0
              ? Math.round((session.completed_exercises / session.total_exercises) * 100)
              : 0
          const hasPain = session.exercises.some((e) => e.pain_level && e.pain_level > 3)

          return (
            <div key={session.session_id} className="flex items-center gap-2 text-xs">
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {session.session_completed ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : pct > 0 ? (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-yellow-400" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/30" />
                )}
              </div>

              {/* Date */}
              <span className="text-muted-foreground w-24 flex-shrink-0">
                {formatDate(session.session_date)}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: pct === 100 ? "#22c55e" : pct > 0 ? "#eab308" : "transparent",
                  }}
                />
              </div>

              {/* Percentage */}
              <span className={`w-8 text-right ${complianceColor(pct)}`}>{pct}%</span>

              {/* Pain flag */}
              {hasPain && <AlertTriangle className="h-3 w-3 text-orange-400 flex-shrink-0" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
