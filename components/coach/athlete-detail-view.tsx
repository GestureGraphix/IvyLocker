"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  Droplets,
  Flame,
  Beef,
  Brain,
  Heart,
  Activity,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AssignWorkoutDialog } from "./assign-workout-dialog"

interface AthleteData {
  athlete: {
    id: string
    name: string
    email: string
    sport?: string
    team?: string
    position?: string
    university?: string
    level?: string
    height_cm?: number
    weight_kg?: number
    tags?: string[]
    hydration_goal_oz: number
    calorie_goal: number
    protein_goal_grams: number
  }
  checkIns: Array<{
    date: string
    mental_state: number
    physical_state: number
    notes?: string
  }>
  todayStats: {
    hydration: number
    hydrationGoal: number
    meals: number
    calories: number
    calorieGoal: number
    protein: number
    proteinGoal: number
  }
  sessions: Array<{
    id: string
    title: string
    type: string
    start_at: string
    end_at: string
    intensity: string
    completed: boolean
    assigned_by?: string
  }>
  compliance: {
    completed: number
    total: number
    rate: number | null
  }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function AthleteDetailView({ athleteId }: { athleteId: string }) {
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<AthleteData>(
    `/api/coach/athletes/${athleteId}`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data?.athlete) {
    return (
      <div className="p-8">
        <GlassCard className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load athlete data</p>
          <Link href="/coach">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Roster
            </Button>
          </Link>
        </GlassCard>
      </div>
    )
  }

  const { athlete, checkIns, todayStats, sessions, compliance } = data
  const todayCheckin = checkIns.find(
    (c) => c.date === new Date().toISOString().split("T")[0]
  )

  const wellnessScore = todayCheckin
    ? Math.round((todayCheckin.mental_state + todayCheckin.physical_state) / 2)
    : null

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/coach">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-xl">
              {athlete.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{athlete.name}</h1>
            <p className="text-muted-foreground">{athlete.email}</p>
          </div>
        </div>
        <Button onClick={() => setAssignWorkoutOpen(true)} className="gradient-primary">
          <Calendar className="h-4 w-4 mr-2" />
          Assign Workout
        </Button>
      </div>

      {/* Profile Info */}
      <div className="flex flex-wrap gap-2">
        {athlete.sport && <Badge variant="outline">{athlete.sport}</Badge>}
        {athlete.team && <Badge variant="secondary">{athlete.team}</Badge>}
        {athlete.position && <Badge variant="secondary">{athlete.position}</Badge>}
        {athlete.university && <Badge variant="secondary">{athlete.university}</Badge>}
        {athlete.level && <Badge variant="outline">{athlete.level}</Badge>}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div
            className={cn(
              "text-3xl font-bold",
              wellnessScore === null
                ? "text-muted-foreground"
                : wellnessScore >= 7
                  ? "text-success"
                  : wellnessScore >= 4
                    ? "text-warning"
                    : "text-destructive"
            )}
          >
            {wellnessScore !== null ? `${wellnessScore}/10` : "—"}
          </div>
          <div className="text-sm text-muted-foreground">Today's Wellness</div>
        </GlassCard>

        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
          <div className="text-3xl font-bold text-success">
            {compliance.rate !== null ? `${compliance.rate}%` : "—"}
          </div>
          <div className="text-sm text-muted-foreground">
            Training Compliance ({compliance.completed}/{compliance.total})
          </div>
        </GlassCard>

        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-warning" />
          </div>
          <div className="text-3xl font-bold text-warning">{sessions.length}</div>
          <div className="text-sm text-muted-foreground">Sessions This Week</div>
        </GlassCard>

        <GlassCard className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </div>
          <div className="text-3xl font-bold text-accent">
            {todayCheckin ? "Yes" : "No"}
          </div>
          <div className="text-sm text-muted-foreground">Checked In Today</div>
        </GlassCard>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Nutrition */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-warning" />
            Today's Nutrition
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <Droplets className="h-4 w-4 text-primary" />
                  Hydration
                </span>
                <span>
                  {todayStats.hydration} / {todayStats.hydrationGoal} oz
                </span>
              </div>
              <Progress
                value={(todayStats.hydration / todayStats.hydrationGoal) * 100}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-warning" />
                  Calories
                </span>
                <span>
                  {todayStats.calories} / {todayStats.calorieGoal}
                </span>
              </div>
              <Progress
                value={(todayStats.calories / todayStats.calorieGoal) * 100}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <Beef className="h-4 w-4 text-success" />
                  Protein
                </span>
                <span>
                  {todayStats.protein}g / {todayStats.proteinGoal}g
                </span>
              </div>
              <Progress
                value={(todayStats.protein / todayStats.proteinGoal) * 100}
                className="h-2"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              {todayStats.meals} meals logged today
            </p>
          </div>
        </GlassCard>

        {/* Recent Check-ins */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            Recent Check-ins (7 days)
          </h2>

          {checkIns.length === 0 ? (
            <p className="text-muted-foreground text-sm">No check-ins in the past 7 days</p>
          ) : (
            <div className="space-y-3">
              {checkIns.map((checkin) => (
                <div
                  key={checkin.date}
                  className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
                >
                  <span className="text-sm">
                    {new Date(checkin.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Brain className="h-3 w-3 text-accent" />
                      {checkin.mental_state}/10
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3 text-destructive" />
                      {checkin.physical_state}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Upcoming Sessions */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Sessions (7 days)
        </h2>

        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sessions scheduled</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "flex items-center justify-between p-3 bg-secondary/30 rounded-lg",
                  session.completed && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  {session.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                  <div>
                    <p className={cn("font-medium", session.completed && "line-through")}>
                      {session.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.start_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(session.start_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{session.type}</Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      session.intensity === "high" && "border-destructive text-destructive",
                      session.intensity === "medium" && "border-warning text-warning",
                      session.intensity === "low" && "border-success text-success"
                    )}
                  >
                    {session.intensity}
                  </Badge>
                  {session.assigned_by && (
                    <Badge variant="secondary" className="text-xs">
                      Assigned
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Assign Workout Dialog */}
      <AssignWorkoutDialog
        open={assignWorkoutOpen}
        onOpenChange={setAssignWorkoutOpen}
        selectedAthleteIds={[athleteId]}
        athletes={[{ id: athlete.id, name: athlete.name }]}
        onSuccess={() => mutate()}
      />
    </div>
  )
}
