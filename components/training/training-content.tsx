"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { SessionCard } from "./session-card"
import { AddSessionDialog } from "./add-session-dialog"
import { TemplateDialog } from "./template-dialog"
import { TemplateCard } from "./template-card"
import { FormAnalysisButton } from "./form-analysis"
import { AssignedWorkoutCard } from "./assigned-workout-card"
import { Plus, Calendar, Dumbbell, Trophy, Filter, LayoutTemplate, ChevronDown, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import useSWR from "swr"
import { TrainingSkeleton } from "@/components/ui/skeletons"
import Link from "next/link"

type SessionType = "all" | "strength" | "conditioning" | "practice" | "competition"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function TrainingContent() {
  const [filter, setFilter] = useState<SessionType>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)

  // Fetch only incomplete sessions for the training page
  const { data: sessionsData, mutate: mutateSessions, isLoading: sessionsLoading } = useSWR("/api/athletes/sessions?excludeCompleted=true", fetcher)
  const { data: templatesData, mutate: mutateTemplates, isLoading: templatesLoading } = useSWR("/api/athletes/templates", fetcher)
  // Fetch only incomplete workouts for the training page
  const { data: workoutsData, mutate: mutateWorkouts, isLoading: workoutsLoading } = useSWR("/api/athletes/workouts?week=current&excludeCompleted=true", fetcher)
  // Fetch count of completed items this week for the link
  const { data: completedWorkoutsData } = useSWR("/api/athletes/workouts/history?days=7", fetcher)
  const { data: completedSessionsData } = useSWR("/api/athletes/sessions/history?days=7", fetcher)

  const sessions = sessionsData?.sessions || []
  const templates = templatesData?.templates || []
  const assignedWorkouts = workoutsData?.workouts || []
  const completedWorkoutsCount = completedWorkoutsData?.workouts?.length || 0
  const completedSessionsCount = completedSessionsData?.sessions?.length || 0
  const totalCompletedCount = completedWorkoutsCount + completedSessionsCount

  if (sessionsLoading || workoutsLoading) {
    return <TrainingSkeleton />
  }

  const todayStr = new Date().toDateString()

  const todaySessions = sessions.filter((s: { start_at: string }) =>
    new Date(s.start_at).toDateString() === todayStr
  )
  const todayAssigned = assignedWorkouts.filter((w: { workout_date: string }) =>
    new Date(String(w.workout_date).slice(0, 10) + "T00:00:00").toDateString() === todayStr
  )
  const todayCount = todaySessions.length + todayAssigned.length

  // Merge sessions + assigned workouts into one sorted list
  type UnifiedItem =
    | { kind: "session"; date: Date; sessionType: string; data: (typeof sessions)[0] }
    | { kind: "assigned"; date: Date; sessionType: string; data: (typeof assignedWorkouts)[0] }

  const allItems: UnifiedItem[] = [
    ...sessions.map((s: { type: string; start_at: string }) => ({
      kind: "session" as const,
      date: new Date(s.start_at),
      sessionType: s.type,
      data: s,
    })),
    ...assignedWorkouts.map((w: { session_type: string; workout_date: string }) => ({
      kind: "assigned" as const,
      date: new Date(String(w.workout_date).slice(0, 10) + "T00:00:00"),
      sessionType: w.session_type,
      data: w,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  const filteredItems = filter === "all" ? allItems : allItems.filter((item) => item.sessionType === filter)

  const filters: { value: SessionType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "strength", label: "Strength" },
    { value: "conditioning", label: "Conditioning" },
    { value: "practice", label: "Practice" },
    { value: "competition", label: "Competition" },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="flex items-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "1px", color: "var(--ink)" }}
          >
            <Dumbbell className="h-6 w-6" style={{ color: "var(--ivy-mid)" }} />
            Training
          </h1>
          <p className="text-muted-foreground text-sm">Schedule, track, and analyze your workouts</p>
        </div>
        <div className="flex gap-2">
          <Link href="/training/history">
            <Button variant="outline" className="border-border/50">
              <History className="h-4 w-4 mr-2" />
              History{totalCompletedCount > 0 && ` (${totalCompletedCount})`}
            </Button>
          </Link>
          <FormAnalysisButton />
          <Button
            variant="outline"
            onClick={() => setIsTemplateDialogOpen(true)}
            className="border-border/50"
          >
            <LayoutTemplate className="h-4 w-4 mr-2" />
            New Template
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div
        className="grid grid-cols-3 bg-white overflow-hidden"
        style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
      >
        {[
          { icon: Calendar, label: "Today", value: todayCount, color: "var(--gold)" },
          { icon: Trophy, label: "Completed", value: totalCompletedCount, color: "var(--ivy-mid)" },
          { icon: Dumbbell, label: "Scheduled", value: allItems.length, color: "var(--ivy)" },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <div
            key={label}
            className="flex items-center gap-3 p-4"
            style={{ borderRight: i < 2 ? "1px solid var(--rule)" : "none" }}
          >
            <Icon className="h-4 w-4 shrink-0" style={{ color, opacity: 0.7 }} />
            <div>
              <p
                style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: "var(--ink)", lineHeight: 1 }}
              >
                {value}
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)" }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>


      {/* Templates Section */}
      {templates.length > 0 && (
        <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4" />
                Training Templates ({templates.length})
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", templatesOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template: {
                id: string
                name: string
                type: string
                duration_minutes: number
                intensity: string
                focus?: string
                notes?: string
                exercises?: Array<{
                  name: string
                  notes?: string
                  sets: Array<{ reps: number; weight?: number; rpe?: number }>
                }>
                schedule?: {
                  enabled: boolean
                  weekdays: number[]
                  start_time: string
                  end_date?: string
                }
              }) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUpdate={() => mutateTemplates()}
                  onSessionCreated={() => mutateSessions()}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Empty templates state */}
      {templates.length === 0 && !templatesLoading && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary">
                <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No templates yet</p>
                <p className="text-sm text-muted-foreground">Create templates to quickly add recurring workouts</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </div>
        </GlassCard>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              filter === f.value
                ? "bg-ivy text-cream border border-ivy"
                : "bg-secondary text-muted-foreground hover:text-foreground border border-border",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sessions List — all items sorted by date */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === "all" ? "Get started by adding your first workout" : `No ${filter} sessions scheduled`}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </GlassCard>
        ) : (
          filteredItems.map((item) =>
            item.kind === "assigned" ? (
              <AssignedWorkoutCard
                key={`assigned-${item.data.id}`}
                workout={item.data}
                onUpdate={() => mutateWorkouts()}
                showDate
              />
            ) : (
              <SessionCard
                key={`session-${item.data.id}`}
                session={item.data}
                onUpdate={() => mutateSessions()}
              />
            )
          )
        )}
        {totalCompletedCount > 0 && (
          <div className="text-center pt-2">
            <Link href="/training/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <History className="h-4 w-4 mr-2" />
                View {totalCompletedCount} completed workout{totalCompletedCount !== 1 ? "s" : ""}
              </Button>
            </Link>
          </div>
        )}
      </div>

      <AddSessionDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSuccess={() => mutateSessions()} />
      <TemplateDialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen} onSuccess={() => mutateTemplates()} />
    </div>
  )
}
