"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { SessionCard } from "./session-card"
import { AddSessionDialog } from "./add-session-dialog"
import { TemplateDialog } from "./template-dialog"
import { TemplateCard } from "./template-card"
import { Plus, Calendar, Dumbbell, Trophy, Filter, LayoutTemplate, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import useSWR from "swr"
import { TrainingSkeleton } from "@/components/ui/skeletons"

type SessionType = "all" | "strength" | "conditioning" | "practice" | "competition"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function TrainingContent() {
  const [filter, setFilter] = useState<SessionType>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)

  const { data: sessionsData, mutate: mutateSessions, isLoading: sessionsLoading } = useSWR("/api/athletes/sessions", fetcher)
  const { data: templatesData, mutate: mutateTemplates, isLoading: templatesLoading } = useSWR("/api/athletes/templates", fetcher)

  const sessions = sessionsData?.sessions || []
  const templates = templatesData?.templates || []

  if (sessionsLoading) {
    return <TrainingSkeleton />
  }

  const filteredSessions = filter === "all" ? sessions : sessions.filter((s: { type: string }) => s.type === filter)

  const todaySessions = sessions.filter((s: { start_at: string }) => {
    const sessionDate = new Date(s.start_at).toDateString()
    return sessionDate === new Date().toDateString()
  })

  const completedThisWeek = sessions.filter((s: { completed: boolean; start_at: string }) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return s.completed && new Date(s.start_at) > weekAgo
  }).length

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
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Dumbbell className="h-7 w-7 text-warning" />
            Training
          </h1>
          <p className="text-muted-foreground">Schedule, track, and analyze your workouts</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTemplateDialogOpen(true)}
            className="border-border/50"
          >
            <LayoutTemplate className="h-4 w-4 mr-2" />
            New Template
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="gradient-primary glow-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <Calendar className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todaySessions.length}</p>
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Trophy className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedThisWeek}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Templates Section */}
      {templates.length > 0 && (
        <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between bg-secondary/30 border-border/50 hover:bg-secondary/50"
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
                ? "gradient-primary text-white glow-primary"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === "all" ? "Get started by adding your first workout" : `No ${filter} sessions scheduled`}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gradient-primary glow-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </GlassCard>
        ) : (
          filteredSessions.map(
            (session: {
              id: string
              type: string
              title: string
              start_at: string
              end_at: string
              intensity: string
              focus: string
              notes: string
              completed: boolean
              exercises?: Array<{
                id: string
                name: string
                notes?: string
                sets: Array<{ id: string; reps: number; weight?: number; rpe?: number; completed: boolean }>
              }>
            }) => <SessionCard key={session.id} session={session} onUpdate={() => mutateSessions()} />,
          )
        )}
      </div>

      <AddSessionDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSuccess={() => mutateSessions()} />
      <TemplateDialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen} onSuccess={() => mutateTemplates()} />
    </div>
  )
}
