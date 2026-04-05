"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExerciseLibrary } from "@/components/mobility/exercise-library"
import { MobilityHistory } from "@/components/mobility/mobility-history"
import { LogMobilityDialog } from "@/components/mobility/log-mobility-dialog"
import { Plus, Activity, Calendar, Clock, Target, Check, Stethoscope } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type Category = "rehab" | "prehab"

interface PhysioExercise {
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
}

interface PhysioSession {
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
  exercises: PhysioExercise[]
}

interface LogEntry {
  id: string
  exercise_id: string
  exercise_name: string
  body_group: string
  date: string
  duration_minutes: number
  notes: string
  category: string
}

interface Exercise {
  id: string
  name: string
  body_group: string
  youtube_url: string | null
  sets: number | null
  reps: number | null
  duration_seconds: number | null
}

export function PhysioContent() {
  const today = new Date().toISOString().split("T")[0]

  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [activeTab, setActiveTab] = useState("today")

  const { data: exercisesData, mutate: mutateExercises } = useSWR("/api/athletes/mobility-exercises", fetcher)
  const { data: logsData, mutate: mutateLogs } = useSWR("/api/athletes/mobility-logs", fetcher)
  const { data: sessionsData, mutate: mutateSessions } = useSWR<{ sessions: PhysioSession[] }>(
    `/api/athletes/physio-sessions?date=${today}`, fetcher
  )
  const physioSessions = sessionsData?.sessions || []

  async function toggleExercise(sessionId: string, exerciseId: string, completed: boolean) {
    const url = `/api/athletes/physio-sessions/${sessionId}/exercises/${exerciseId}/complete`
    try {
      const res = await fetch(url, {
        method: completed ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: completed ? undefined : JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      mutateSessions()
    } catch {
      toast.error("Failed to update exercise")
    }
  }

  async function toggleSession(sessionId: string, completed: boolean) {
    const url = `/api/athletes/physio-sessions/${sessionId}/complete`
    try {
      const res = await fetch(url, {
        method: completed ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: completed ? undefined : JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      mutateSessions()
      if (!completed) toast.success("Session complete!")
    } catch {
      toast.error("Failed to update session")
    }
  }

  const exercises: Exercise[] = exercisesData?.exercises || []
  const logs: LogEntry[] = logsData?.logs || []

  const rehabLogs = logs.filter((l) => l.category === "rehab")
  const prehabLogs = logs.filter((l) => l.category === "prehab")
  const allLogs = logs.filter((l) => l.category === "rehab" || l.category === "prehab")

  // Stats across rehab + prehab
  const todayMinutes = allLogs
    .filter((l) => l.date === today)
    .reduce((acc, l) => acc + l.duration_minutes, 0)

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weekMinutes = allLogs
    .filter((l) => new Date(l.date) >= weekAgo)
    .reduce((acc, l) => acc + l.duration_minutes, 0)

  const bodyGroups = [...new Set(allLogs.map((l) => l.body_group).filter(Boolean))]

  const categoryForTab = (activeTab === "library" || activeTab === "history" ? "rehab" : activeTab) as Category

  const tabLabel: Record<string, string> = {
    rehab: "Rehab",
    prehab: "Prehab",
  }

  const handleLogExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setIsLogDialogOpen(true)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="flex items-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "1px", color: "var(--ink)" }}
          >
            <Activity className="h-6 w-6" style={{ color: "var(--ivy-mid)" }} />
            Physio
          </h1>
          <p className="text-muted-foreground text-sm">Rehab and prehab tracking</p>
        </div>

        {(activeTab === "rehab" || activeTab === "prehab") && (
          <Button
            onClick={() => {
              setSelectedExercise(null)
              setIsLogDialogOpen(true)
            }}
            className="gradient-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Log {tabLabel[activeTab]}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-pale">
              <Clock className="h-5 w-5" style={{ color: "#8a6500" }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayMinutes}</p>
              <p className="text-sm text-muted-foreground">Minutes Today</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-ivy-pale">
              <Calendar className="h-5 w-5" style={{ color: "var(--ivy-mid)" }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{weekMinutes}</p>
              <p className="text-sm text-muted-foreground">Minutes This Week</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-ivy-pale">
              <Target className="h-5 w-5" style={{ color: "var(--ivy-mid)" }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{bodyGroups.length}</p>
              <p className="text-sm text-muted-foreground">Body Groups</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="rehab">Rehab</TabsTrigger>
          <TabsTrigger value="prehab">Prehab</TabsTrigger>
          <TabsTrigger value="library">Exercise Library</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          {physioSessions.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <Stethoscope className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No physio sessions scheduled for today</p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {physioSessions.map((session) => {
                const totalEx = session.exercises.length
                const doneEx = session.exercises.filter((e) => e.completed).length
                const allDone = totalEx > 0 && doneEx === totalEx
                const sessionDone = !!session.session_completion_id
                const typeColor = session.program_type === "rehab" ? "#f97316" : "#a78bfa"

                return (
                  <GlassCard key={session.session_id} className="overflow-hidden">
                    {/* Session header */}
                    <div className="flex items-center justify-between p-4 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="px-2 py-0.5 rounded text-white text-xs font-medium uppercase"
                          style={{ background: typeColor, letterSpacing: "0.5px" }}
                        >
                          {session.program_type}
                        </span>
                        <div>
                          <p className="font-medium" style={{ opacity: sessionDone ? 0.5 : 1, textDecoration: sessionDone ? "line-through" : "none" }}>
                            {session.program_title}
                            {session.session_title && ` — ${session.session_title}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.physio_name} · {doneEx}/{totalEx} exercises
                          </p>
                        </div>
                      </div>
                    </div>

                    {session.session_notes && (
                      <p className="px-4 pb-2 text-sm text-muted-foreground italic">
                        {session.session_notes}
                      </p>
                    )}

                    {/* Exercise list with checkboxes */}
                    <div className="px-4 pb-3 space-y-2">
                      {session.exercises.map((ex) => (
                        <button
                          key={ex.id}
                          onClick={() => toggleExercise(session.session_id, ex.id, ex.completed)}
                          className="w-full flex items-start gap-3 text-left py-1.5 group"
                        >
                          <div
                            className="mt-0.5 h-5 w-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{
                              border: `2px solid ${ex.completed ? typeColor : "var(--border)"}`,
                              background: ex.completed ? typeColor : "transparent",
                            }}
                          >
                            {ex.completed && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span
                                className="font-medium"
                                style={{
                                  textDecoration: ex.completed ? "line-through" : "none",
                                  opacity: ex.completed ? 0.5 : 1,
                                }}
                              >
                                {ex.name}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {[
                                  ex.sets && ex.reps && `${ex.sets}x${ex.reps}`,
                                  ex.hold_seconds && `${ex.hold_seconds}s hold`,
                                  ex.side && `[${ex.side}]`,
                                ].filter(Boolean).join(" · ")}
                              </span>
                            </div>
                            {ex.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{ex.notes}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Session complete button */}
                    {totalEx > 0 && (
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => toggleSession(session.session_id, sessionDone)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            background: sessionDone ? "transparent" : allDone ? typeColor : "var(--border)",
                            color: sessionDone ? "var(--muted-foreground)" : allDone ? "#fff" : "var(--foreground)",
                            border: sessionDone ? "1px solid var(--border)" : "none",
                          }}
                        >
                          {sessionDone ? "Completed" : (
                            <>
                              <Check className="h-4 w-4" />
                              Mark Session Done
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </GlassCard>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rehab">
          <MobilityHistory
            logs={rehabLogs}
            onUpdate={() => mutateLogs()}
            emptyLabel="No rehab sessions logged"
          />
        </TabsContent>

        <TabsContent value="prehab">
          <MobilityHistory
            logs={prehabLogs}
            onUpdate={() => mutateLogs()}
            emptyLabel="No prehab sessions logged"
          />
        </TabsContent>

        <TabsContent value="library">
          <ExerciseLibrary
            exercises={exercises}
            onLogExercise={handleLogExercise}
            onUpdate={() => mutateExercises()}
          />
        </TabsContent>

        <TabsContent value="history">
          <MobilityHistory
            logs={allLogs}
            onUpdate={() => mutateLogs()}
            emptyLabel="No sessions logged yet"
          />
        </TabsContent>
      </Tabs>

      <LogMobilityDialog
        open={isLogDialogOpen}
        onOpenChange={setIsLogDialogOpen}
        onSuccess={() => mutateLogs()}
        exercises={exercises}
        selectedExercise={selectedExercise}
        defaultCategory={categoryForTab}
      />
    </div>
  )
}
