"use client"

import { useState } from "react"
import Model, { type IExerciseData, type IMuscleStats, type Muscle } from "react-body-highlighter"

// Human-readable labels for the library's muscle slugs. Exported so the
// check-in chips and weekly summary can humanize stored soreness IDs.
export const MUSCLE_LABELS: Record<string, string> = {
  trapezius: "Traps",
  "upper-back": "Upper Back",
  "lower-back": "Lower Back",
  chest: "Chest",
  biceps: "Biceps",
  triceps: "Triceps",
  forearm: "Forearms",
  "back-deltoids": "Rear Delts",
  "front-deltoids": "Shoulders",
  abs: "Abs",
  obliques: "Obliques",
  adductor: "Adductors",
  abductors: "Abductors",
  hamstring: "Hamstrings",
  quadriceps: "Quads",
  calves: "Calves",
  gluteal: "Glutes",
  head: "Head",
  neck: "Neck",
  knees: "Knees",
  "left-soleus": "L Soleus",
  "right-soleus": "R Soleus",
}

export function muscleLabel(slug: string): string {
  return MUSCLE_LABELS[slug] ?? slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

const SORE_RED = "#b83232"

interface BodyMapProps {
  selected: string[]
  onChange: (ids: string[]) => void
}

export function BodyMap({ selected, onChange }: BodyMapProps) {
  const [view, setView] = useState<"anterior" | "posterior">("anterior")

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter(s => s !== slug) : [...selected, slug])
  }

  // Single highlight group; frequency 1 -> highlightedColors[0].
  const data: IExerciseData[] = [
    { name: "soreness", muscles: selected as Muscle[], frequency: 1 },
  ]

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Front / Back toggle */}
      <div
        className="flex rounded overflow-hidden self-center"
        style={{
          border: "1px solid var(--cream-dd, #e8e2d9)",
          background: "var(--cream-d, #f0ece4)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        {([["anterior", "Front"], ["posterior", "Back"]] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-4 py-1.5 transition-all"
            style={{
              background: view === v ? "var(--ink)" : "transparent",
              color: view === v ? "#fff" : "var(--muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Anatomical body */}
      <div style={{ width: 170 }}>
        <Model
          data={data}
          type={view}
          highlightedColors={[SORE_RED]}
          bodyColor="#e7e0d3"
          onClick={(exercise: IMuscleStats) => toggle(exercise.muscle)}
          style={{ width: "100%" }}
        />
      </div>

      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "11px",
          color: "var(--muted)",
          textAlign: "center",
        }}
      >
        Click a muscle to mark soreness
      </p>
    </div>
  )
}
