"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExerciseLibrary } from "@/components/mobility/exercise-library"
import { MobilityHistory } from "@/components/mobility/mobility-history"
import { LogMobilityDialog } from "@/components/mobility/log-mobility-dialog"
import { Plus, Activity, Calendar, Clock, Target, Stethoscope, ExternalLink } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type Category = "rehab" | "prehab"

interface Assignment {
  id: string
  title: string
  type: "prehab" | "rehab"
  description: string | null
  frequency: string | null
  physio_name: string
  physio_scheduling_link: string | null
  status: string
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
  const [activeTab, setActiveTab] = useState("rehab")

  const { data: exercisesData, mutate: mutateExercises } = useSWR("/api/athletes/mobility-exercises", fetcher)
  const { data: logsData, mutate: mutateLogs } = useSWR("/api/athletes/mobility-logs", fetcher)
  const { data: assignmentsData } = useSWR("/api/athletes/physio-assignments", fetcher)

  const exercises: Exercise[] = exercisesData?.exercises || []
  const logs: LogEntry[] = logsData?.logs || []
  const assignments: Assignment[] = assignmentsData?.assignments || []

  const rehabLogs = logs.filter((l) => l.category === "rehab")
  const prehabLogs = logs.filter((l) => l.category === "prehab")
  const allLogs = logs.filter((l) => l.category === "rehab" || l.category === "prehab")

  const rehabPlans = assignments.filter((a) => a.type === "rehab" && a.status === "active")
  const prehabPlans = assignments.filter((a) => a.type === "prehab" && a.status === "active")

  const todayMinutes = allLogs
    .filter((l) => l.date === today)
    .reduce((acc, l) => acc + l.duration_minutes, 0)

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weekMinutes = allLogs
    .filter((l) => new Date(l.date) >= weekAgo)
    .reduce((acc, l) => acc + l.duration_minutes, 0)

  const bodyGroups = [...new Set(allLogs.map((l) => l.body_group).filter(Boolean))]

  const categoryForTab = (activeTab === "library" || activeTab === "history" ? "rehab" : activeTab) as Category

  const tabLabel: Record<string, string> = { rehab: "Rehab", prehab: "Prehab" }

  const handleLogExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setIsLogDialogOpen(true)
  }

  const renderPlans = (plans: Assignment[]) => {
    if (plans.length === 0) return null

    return (
      <div className="space-y-3 mb-4">
        {plans.map((plan) => (
          <GlassCard key={plan.id} className="overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: plan.description ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-2.5">
                <Stethoscope className="h-4 w-4 flex-shrink-0" style={{ color: plan.type === "rehab" ? "#f97316" : "#a78bfa" }} />
                <div>
                  <p className="text-sm font-semibold">{plan.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {plan.physio_name}
                    {plan.frequency && ` · ${plan.frequency}`}
                  </p>
                </div>
              </div>
            </div>
            {plan.description && (
              <div
                className="px-4 py-3"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  lineHeight: "1.8",
                  color: "var(--ink)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {plan.description}
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    )
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

      {/* Scheduling link from physio */}
      {(() => {
        const link = assignments.find((a) => a.physio_scheduling_link)?.physio_scheduling_link
        const physioName = assignments.find((a) => a.physio_scheduling_link)?.physio_name
        if (!link) return null
        return (
          <GlassCard className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-5 w-5 flex-shrink-0" style={{ color: "#a78bfa" }} />
              <div>
                <p className="text-sm font-medium">Schedule with {physioName}</p>
                <p className="text-xs text-muted-foreground">Book an appointment</p>
              </div>
            </div>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: "#a78bfa" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Book
            </a>
          </GlassCard>
        )
      })()}

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
          <TabsTrigger value="rehab">Rehab</TabsTrigger>
          <TabsTrigger value="prehab">Prehab</TabsTrigger>
          <TabsTrigger value="library">Exercise Library</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rehab">
          <div className="space-y-4">
            {renderPlans(rehabPlans)}
            <MobilityHistory
              logs={rehabLogs}
              onUpdate={() => mutateLogs()}
              emptyLabel={rehabPlans.length === 0 ? "No rehab sessions logged" : ""}
            />
          </div>
        </TabsContent>

        <TabsContent value="prehab">
          <div className="space-y-4">
            {renderPlans(prehabPlans)}
            <MobilityHistory
              logs={prehabLogs}
              onUpdate={() => mutateLogs()}
              emptyLabel={prehabPlans.length === 0 ? "No prehab sessions logged" : ""}
            />
          </div>
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
