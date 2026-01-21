"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Coffee,
  Trophy,
  MapPin,
  User,
  History,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Exercise {
  id: string
  name: string
  details: string | null
  sort_order: number
}

interface CompletedWorkout {
  id: string
  workout_date: string
  completed: boolean
  completed_at: string | null
  athlete_notes: string | null
  perceived_effort: number | null
  session_id: string
  session_type: string
  session_title: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  is_optional: boolean
  plan_name: string
  coach_name: string
  exercises: Exercise[] | null
  source: "coach"
}

interface SessionExercise {
  id: string
  name: string
  notes?: string
  sets: Array<{ id: string; reps: number; weight?: number; rpe?: number; completed: boolean }>
}

interface CompletedSession {
  id: string
  title: string
  type: string
  start_at: string
  end_at: string
  intensity: string
  focus?: string
  notes?: string
  completed: boolean
  exercises?: SessionExercise[]
  source: "self"
}

type HistoryItem = (CompletedWorkout | CompletedSession) & { sortDate: string }

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const SESSION_COLORS: Record<string, string> = {
  practice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lift: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  strength: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  conditioning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  recovery: "bg-green-500/20 text-green-400 border-green-500/30",
  competition: "bg-red-500/20 text-red-400 border-red-500/30",
  optional: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const getSessionIcon = (type: string) => {
  switch (type) {
    case "lift":
    case "strength":
      return <Dumbbell className="h-4 w-4" />
    case "recovery":
    case "optional":
      return <Coffee className="h-4 w-4" />
    case "competition":
      return <Trophy className="h-4 w-4" />
    default:
      return <Dumbbell className="h-4 w-4" />
  }
}

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function CoachWorkoutLogCard({ workout }: { workout: CompletedWorkout }) {
  const [expanded, setExpanded] = useState(false)

  const formatTime = (time: string | null) => {
    if (!time) return null
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const sessionColor = SESSION_COLORS[workout.session_type] || SESSION_COLORS.practice

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="pt-0.5">
        <div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="h-3 w-3 text-success" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-xs", sessionColor)}>
            {getSessionIcon(workout.session_type)}
            <span className="ml-1 capitalize">{workout.session_type}</span>
          </Badge>
          <Badge variant="outline" className="text-xs text-primary border-primary/50">
            <ClipboardList className="h-3 w-3 mr-1" />
            Coach
          </Badge>
          {workout.perceived_effort && (
            <Badge variant="outline" className="text-xs">
              RPE: {workout.perceived_effort}/10
            </Badge>
          )}
        </div>

        <h4 className="font-medium mt-1">
          {workout.session_title || `${workout.session_type.charAt(0).toUpperCase() + workout.session_type.slice(1)} Session`}
        </h4>

        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
          {workout.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(workout.start_time)}
            </span>
          )}
          {workout.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {workout.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {workout.coach_name}
          </span>
        </div>

        {workout.athlete_notes && (
          <p className="text-sm text-muted-foreground mt-2 italic">"{workout.athlete_notes}"</p>
        )}

        {workout.exercises && workout.exercises.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 h-7 px-2 text-xs"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide exercises
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show {workout.exercises.length} exercises
                </>
              )}
            </Button>

            {expanded && (
              <ul className="mt-2 space-y-1 text-sm">
                {workout.exercises.map((ex) => (
                  <li key={ex.id} className="text-muted-foreground">
                    <span className="text-foreground">{ex.name}</span>
                    {ex.details && <span className="ml-1">- {ex.details}</span>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {workout.completed_at && (
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(workout.completed_at).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      )}
    </div>
  )
}

function SelfSessionLogCard({ session }: { session: CompletedSession }) {
  const [expanded, setExpanded] = useState(false)

  const sessionColor = SESSION_COLORS[session.type] || SESSION_COLORS.practice

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="pt-0.5">
        <div className="h-6 w-6 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="h-3 w-3 text-success" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn("text-xs", sessionColor)}>
            {getSessionIcon(session.type)}
            <span className="ml-1 capitalize">{session.type}</span>
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Personal
          </Badge>
          {session.intensity && (
            <Badge variant="outline" className="text-xs">
              {session.intensity}
            </Badge>
          )}
        </div>

        <h4 className="font-medium mt-1">{session.title}</h4>

        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(session.start_at).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          {session.focus && (
            <span className="text-xs">{session.focus}</span>
          )}
        </div>

        {session.notes && (
          <p className="text-sm text-muted-foreground mt-2 italic">"{session.notes}"</p>
        )}

        {session.exercises && session.exercises.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 h-7 px-2 text-xs"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide exercises
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show {session.exercises.length} exercises
                </>
              )}
            </Button>

            {expanded && (
              <ul className="mt-2 space-y-1 text-sm">
                {session.exercises.map((ex) => (
                  <li key={ex.id} className="text-muted-foreground">
                    <span className="text-foreground">{ex.name}</span>
                    {ex.sets && ex.sets.length > 0 && (
                      <span className="ml-1">
                        - {ex.sets.length} sets
                        {ex.sets[0].weight && ` @ ${ex.sets[0].weight}lbs`}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <span className="text-xs text-muted-foreground shrink-0">
        {new Date(session.end_at || session.start_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    </div>
  )
}

export function WorkoutHistory() {
  // Fetch completed coach-assigned workouts (past 30 days)
  const { data: workoutsData, isLoading: workoutsLoading } = useSWR<{ workouts: CompletedWorkout[] }>(
    "/api/athletes/workouts/history",
    fetcher
  )

  // Fetch completed self-created sessions (past 30 days)
  const { data: sessionsData, isLoading: sessionsLoading } = useSWR<{ sessions: CompletedSession[] }>(
    "/api/athletes/sessions/history",
    fetcher
  )

  const isLoading = workoutsLoading || sessionsLoading

  // Combine and normalize both types
  const coachWorkouts: HistoryItem[] = (workoutsData?.workouts || [])
    .filter((w) => w.completed)
    .map((w) => ({
      ...w,
      source: "coach" as const,
      sortDate: w.workout_date,
    }))

  const selfSessions: HistoryItem[] = (sessionsData?.sessions || [])
    .filter((s) => s.completed)
    .map((s) => ({
      ...s,
      source: "self" as const,
      sortDate: new Date(s.start_at).toISOString().split("T")[0],
    }))

  const allItems = [...coachWorkouts, ...selfSessions]

  // Group by date
  const groupedItems = allItems.reduce(
    (acc, item) => {
      const date = item.sortDate
      if (!acc[date]) acc[date] = []
      acc[date].push(item)
      return acc
    },
    {} as Record<string, HistoryItem[]>
  )

  const sortedDates = Object.keys(groupedItems).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  const totalCompleted = allItems.length
  const thisWeekCompleted = allItems.filter((item) => {
    const itemDate = new Date(item.sortDate)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return itemDate >= weekAgo
  }).length

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/training" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-success" />
            Workout History
          </h1>
          <p className="text-muted-foreground">Your completed workouts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{thisWeekCompleted}</p>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
              <p className="text-sm text-muted-foreground">Total (30 days)</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Workout Log */}
      {isLoading ? (
        <GlassCard className="animate-pulse">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-6 w-6 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-5 w-48 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : allItems.length === 0 ? (
        <GlassCard className="text-center py-12">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No completed workouts yet</h3>
          <p className="text-muted-foreground mb-4">Complete your workouts to see them here</p>
          <Link href="/training">
            <Button className="gradient-primary">
              <Dumbbell className="h-4 w-4 mr-2" />
              Go to Training
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const isToday = date === getLocalDateString()
            const isYesterday = date === getLocalDateString(new Date(Date.now() - 86400000))

            let dateLabel: string
            if (isToday) {
              dateLabel = "Today"
            } else if (isYesterday) {
              dateLabel = "Yesterday"
            } else {
              dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })
            }

            return (
              <div key={date} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {dateLabel}
                  </h3>
                  <Badge variant="outline" className="border-success/50 text-success">
                    {groupedItems[date].length} completed
                  </Badge>
                </div>

                <GlassCard>
                  {groupedItems[date].map((item) => (
                    item.source === "coach" ? (
                      <CoachWorkoutLogCard key={`coach-${item.id}`} workout={item as CompletedWorkout} />
                    ) : (
                      <SelfSessionLogCard key={`self-${item.id}`} session={item as CompletedSession} />
                    )
                  ))}
                </GlassCard>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
