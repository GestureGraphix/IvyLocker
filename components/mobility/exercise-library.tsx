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
  Back: "bg-ivy-pale text-ivy-mid border-ivy-light/30",
  Hips: "bg-gold-pale text-[#8a6500] border-gold/30",
  Shoulders: "bg-gold-pale text-[#8a6500] border-gold/30",
  Ankles: "bg-ivy-pale text-ivy-mid border-ivy-light/30",
  Knees: "bg-[#f9e8e8] text-[#b83232] border-[#b83232]/30",
  "Full Body": "bg-ivy-pale text-ivy border-ivy/20",
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
                ? "bg-ivy text-cream border border-ivy"
                : "bg-secondary text-muted-foreground hover:text-foreground border border-border",
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
                    className="p-2 rounded-lg bg-ivy-pale hover:bg-ivy-pale/80 transition-colors"
                  >
                    <Play className="h-4 w-4 text-ivy-mid" />
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
                  className="flex-1 gradient-primary"
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
