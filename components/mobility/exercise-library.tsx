"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Play, Plus, ExternalLink } from "lucide-react"

interface Exercise {
  id: string
  name: string
  body_group: string
  youtube_url: string | null
  sets: number | null
  reps: number | null
  duration_seconds: number | null
}

interface ExerciseLibraryProps {
  exercises: Exercise[]
  onLogExercise: (exercise: Exercise) => void
  onUpdate: () => void
}

const bodyGroups = ["All", "Back", "Hips", "Shoulders", "Ankles", "Knees", "Full Body"]

const bodyGroupColors: Record<string, string> = {
  Back: "bg-primary/20 text-primary border-primary/30",
  Hips: "bg-accent/20 text-accent border-accent/30",
  Shoulders: "bg-warning/20 text-warning border-warning/30",
  Ankles: "bg-success/20 text-success border-success/30",
  Knees: "bg-destructive/20 text-destructive border-destructive/30",
  "Full Body": "bg-chart-2/20 text-chart-2 border-chart-2/30",
}

export function ExerciseLibrary({ exercises, onLogExercise }: ExerciseLibraryProps) {
  const [filter, setFilter] = useState("All")

  const filteredExercises = filter === "All" ? exercises : exercises.filter((e) => e.body_group === filter)

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {bodyGroups.map((group) => (
          <button
            key={group}
            onClick={() => setFilter(group)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              filter === group
                ? "gradient-primary text-white glow-primary"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Exercise grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <GlassCard key={exercise.id} className="group hover:border-primary/30 transition-all">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{exercise.name}</h3>
                  <Badge variant="outline" className={cn("mt-1", bodyGroupColors[exercise.body_group] || "")}>
                    {exercise.body_group}
                  </Badge>
                </div>
                {exercise.youtube_url && (
                  <a
                    href={exercise.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-colors"
                  >
                    <Play className="h-4 w-4 text-destructive" />
                  </a>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {exercise.sets && exercise.reps && (
                  <span>
                    {exercise.sets} sets x {exercise.reps} reps
                  </span>
                )}
                {exercise.sets && exercise.duration_seconds && (
                  <span>
                    {exercise.sets} sets x {exercise.duration_seconds}s hold
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => onLogExercise(exercise)}
                  size="sm"
                  className="flex-1 gradient-primary glow-primary"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Log
                </Button>
                {exercise.youtube_url && (
                  <Button asChild variant="outline" size="sm">
                    <a href={exercise.youtube_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <GlassCard className="text-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No exercises found</h3>
          <p className="text-muted-foreground">No exercises in this body group yet</p>
        </GlassCard>
      )}
    </div>
  )
}

// Fix missing import
import { Activity } from "lucide-react"
