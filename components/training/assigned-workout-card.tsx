"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Check,
  Clock,
  MapPin,
  Dumbbell,
  Coffee,
  Trophy,
  ChevronDown,
  ChevronUp,
  User,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Exercise {
  id: string
  name: string
  details: string | null
  sort_order: number
}

interface AssignedWorkout {
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
  hide_exercises: boolean
  day_intensities: Record<string, string> | null
}

interface AssignedWorkoutCardProps {
  workout: AssignedWorkout
  onUpdate: () => void
  showDate?: boolean
}

const SESSION_ICONS: Record<string, React.ReactNode> = {
  practice: <Dumbbell className="h-4 w-4" />,
  lift: <Dumbbell className="h-4 w-4" />,
  conditioning: <Dumbbell className="h-4 w-4" />,
  recovery: <Coffee className="h-4 w-4" />,
  competition: <Trophy className="h-4 w-4" />,
  optional: <Coffee className="h-4 w-4" />,
}

const SESSION_COLORS: Record<string, string> = {
  practice: "bg-ivy-pale text-ivy-mid border-ivy-light/30",
  lift: "bg-ivy-pale text-ivy border-ivy/20",
  conditioning: "bg-gold-pale text-[#8a6500] border-gold/30",
  recovery: "bg-ivy-pale text-ivy-mid border-ivy-light/30",
  competition: "bg-[#f9e8e8] text-[#b83232] border-[#b83232]/30",
  optional: "bg-[#ece5d8] text-[#6b6055] border-[#d5cec4]",
}

export function AssignedWorkoutCard({ workout, onUpdate, showDate = false }: AssignedWorkoutCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateOnly = new Date(date)
    dateOnly.setHours(0, 0, 0, 0)

    if (dateOnly.getTime() === today.getTime()) return "Today"
    if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow"
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  const formatTime = (time: string | null) => {
    if (!time) return null
    const [hours, minutes] = time.split(":")
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const handleToggleComplete = async () => {
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/athletes/workouts/${workout.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !workout.completed }),
      })

      if (res.ok) {
        toast.success(workout.completed ? "Marked as incomplete" : "Workout completed!")
        onUpdate()
      } else {
        toast.error("Failed to update workout")
      }
    } catch (error) {
      toast.error("Failed to update workout")
    } finally {
      setIsUpdating(false)
    }
  }

  const sessionColor = SESSION_COLORS[workout.session_type] || SESSION_COLORS.practice
  const sessionIcon = SESSION_ICONS[workout.session_type] || SESSION_ICONS.practice

  return (
    <GlassCard
      className={cn(
        "transition-all",
        workout.completed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Completion Checkbox */}
        <div className="pt-1">
          <Checkbox
            checked={workout.completed}
            onCheckedChange={handleToggleComplete}
            disabled={isUpdating}
            className="border-2 border-muted-foreground/60 data-[state=checked]:border-success data-[state=checked]:bg-success"
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showDate && (
                  <Badge variant="outline" className="text-xs">
                    {formatDate(workout.workout_date)}
                  </Badge>
                )}
                <Badge className={cn("text-xs", sessionColor)}>
                  {sessionIcon}
                  <span className="ml-1 capitalize">{workout.session_type}</span>
                </Badge>
                {workout.is_optional && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Optional
                  </Badge>
                )}
                {workout.completed && (
                  <Badge variant="training" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Done
                  </Badge>
                )}
              </div>

              <h3 className={cn(
                "font-semibold mt-1",
                workout.completed && "line-through text-muted-foreground"
              )}>
                {workout.session_title || `${workout.session_type.charAt(0).toUpperCase() + workout.session_type.slice(1)} Session`}
              </h3>

              {/* Meta info */}
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {workout.start_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(workout.start_time)}
                    {workout.end_time && ` - ${formatTime(workout.end_time)}`}
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
            </div>

            {/* Expand Button */}
            {!workout.hide_exercises && workout.exercises && workout.exercises.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="shrink-0"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Hidden exercises — show intensity */}
          {workout.hide_exercises && (() => {
            const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
            const workoutDay = dayNames[new Date(workout.workout_date + "T12:00:00").getDay()]
            const intensity = workout.day_intensities?.[workoutDay]
            const intensityColors: Record<string, string> = {
              high: "bg-red-500/20 text-red-400 border-red-500/30",
              medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
              low: "bg-green-500/20 text-green-400 border-green-500/30",
            }
            return (
              <div className="mt-2 flex items-center gap-2">
                {intensity && intensity !== "n/a" ? (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${intensityColors[intensity] || ""}`}>
                    {intensity.charAt(0).toUpperCase() + intensity.slice(1)} Intensity
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground italic">
                  Workout details will be revealed at the session
                </span>
              </div>
            )
          })()}

          {/* Exercises (Expandable) */}
          {!workout.hide_exercises && expanded && workout.exercises && workout.exercises.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">EXERCISES</p>
              <ul className="space-y-2">
                {workout.exercises.map((exercise) => (
                  <li key={exercise.id} className="text-sm">
                    <span className="font-medium">{exercise.name}</span>
                    {exercise.details && (
                      <span className="text-muted-foreground ml-2">
                        {exercise.details}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick exercise preview when collapsed */}
          {!workout.hide_exercises && !expanded && workout.exercises && workout.exercises.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2 truncate">
              {workout.exercises.length} exercise{workout.exercises.length !== 1 ? "s" : ""}: {" "}
              {workout.exercises.slice(0, 2).map(e => e.name).join(", ")}
              {workout.exercises.length > 2 && "..."}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
