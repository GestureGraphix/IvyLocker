"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Save,
  Loader2,
  GripVertical,
} from "lucide-react"
import { ExercisePicker } from "./exercise-picker"
import { toast } from "sonner"

export interface SessionExercise {
  id?: string
  exercise_id?: string | null
  name: string
  sets: number | null
  reps: string | null
  hold_seconds: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  side: "left" | "right" | "bilateral" | null
  notes: string | null
}

interface SessionEditorProps {
  programId: string
  sessionId?: string
  initialDate?: string
  initialTitle?: string
  initialNotes?: string
  initialExercises?: SessionExercise[]
  onSave: () => void
  onCancel?: () => void
  onDuplicate?: (sessionId: string) => void
}

function emptyExercise(): SessionExercise {
  return {
    name: "",
    sets: 3,
    reps: "10",
    hold_seconds: null,
    duration_seconds: null,
    rest_seconds: null,
    side: null,
    notes: null,
  }
}

export function SessionEditor({
  programId,
  sessionId,
  initialDate,
  initialTitle,
  initialNotes,
  initialExercises,
  onSave,
  onCancel,
  onDuplicate,
}: SessionEditorProps) {
  const isEditing = !!sessionId
  const [date, setDate] = useState(initialDate || "")
  const [title, setTitle] = useState(initialTitle || "")
  const [notes, setNotes] = useState(initialNotes || "")
  const [exercises, setExercises] = useState<SessionExercise[]>(
    initialExercises?.length ? initialExercises : [emptyExercise()]
  )
  const [saving, setSaving] = useState(false)

  const updateExercise = (idx: number, updates: Partial<SessionExercise>) => {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, ...updates } : ex)))
  }

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= exercises.length) return
    setExercises((prev) => {
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr
    })
  }

  const handleExercisePick = (idx: number, name: string, libraryEx?: { default_sets?: number | null; default_reps?: string | null; default_hold_seconds?: number | null; default_duration_seconds?: number | null; id?: string }) => {
    const updates: Partial<SessionExercise> = { name }
    if (libraryEx) {
      updates.exercise_id = libraryEx.id
      if (libraryEx.default_sets) updates.sets = libraryEx.default_sets
      if (libraryEx.default_reps) updates.reps = libraryEx.default_reps
      if (libraryEx.default_hold_seconds) updates.hold_seconds = libraryEx.default_hold_seconds
      if (libraryEx.default_duration_seconds) updates.duration_seconds = libraryEx.default_duration_seconds
    }
    updateExercise(idx, updates)
  }

  const handleSave = async () => {
    if (!date) {
      toast.error("Please select a date")
      return
    }
    const validExercises = exercises.filter((ex) => ex.name.trim())
    if (validExercises.length === 0) {
      toast.error("Add at least one exercise")
      return
    }

    setSaving(true)
    try {
      const url = isEditing
        ? `/api/physio/programs/${programId}/sessions/${sessionId}`
        : `/api/physio/programs/${programId}/sessions`
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_date: date,
          title: title || null,
          notes: notes || null,
          exercises: validExercises,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save session")
      }

      toast.success(isEditing ? "Session updated" : "Session created")
      onSave()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
      {/* Session metadata */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 text-sm bg-secondary/50"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Label (optional)</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Week 2 - Monday"
            className="h-8 text-sm bg-secondary/50"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-xs text-muted-foreground">Session Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for the athlete..."
          className="min-h-[60px] text-sm bg-secondary/50"
        />
      </div>

      {/* Exercises */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Exercises</Label>
        {exercises.map((ex, idx) => (
          <div key={idx} className="flex gap-2 items-start p-2 rounded-md bg-secondary/20 border border-border/50">
            {/* Reorder */}
            <div className="flex flex-col gap-0.5 pt-1">
              <button
                onClick={() => moveExercise(idx, -1)}
                disabled={idx === 0}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => moveExercise(idx, 1)}
                disabled={idx === exercises.length - 1}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            {/* Exercise fields */}
            <div className="flex-1 space-y-2">
              {/* Name */}
              <ExercisePicker
                value={ex.name}
                onChange={(name, libraryEx) => handleExercisePick(idx, name, libraryEx)}
                placeholder="Search or type exercise name..."
              />

              {/* Sets / Reps / Hold / Side */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Sets</Label>
                  <Input
                    type="number"
                    value={ex.sets ?? ""}
                    onChange={(e) => updateExercise(idx, { sets: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="3"
                    className="h-7 text-xs bg-secondary/50"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Reps</Label>
                  <Input
                    value={ex.reps ?? ""}
                    onChange={(e) => updateExercise(idx, { reps: e.target.value || null })}
                    placeholder="10"
                    className="h-7 text-xs bg-secondary/50"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Hold (sec)</Label>
                  <Input
                    type="number"
                    value={ex.hold_seconds ?? ""}
                    onChange={(e) => updateExercise(idx, { hold_seconds: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="—"
                    className="h-7 text-xs bg-secondary/50"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Side</Label>
                  <select
                    value={ex.side ?? ""}
                    onChange={(e) => updateExercise(idx, { side: (e.target.value || null) as SessionExercise["side"] })}
                    className="h-7 w-full text-xs rounded-md border border-input bg-secondary/50 px-2"
                  >
                    <option value="">Both</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="bilateral">Bilateral</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <Input
                value={ex.notes ?? ""}
                onChange={(e) => updateExercise(idx, { notes: e.target.value || null })}
                placeholder="Cues or modifications..."
                className="h-7 text-xs bg-secondary/50"
              />
            </div>

            {/* Delete */}
            <button
              onClick={() => removeExercise(idx)}
              className="p-1 text-muted-foreground hover:text-destructive mt-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setExercises((prev) => [...prev, emptyExercise()])}
          className="w-full text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Exercise
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        {isEditing && onDuplicate && sessionId && (
          <Button variant="outline" size="sm" onClick={() => onDuplicate(sessionId)}>
            <Copy className="h-3 w-3 mr-1" />
            Duplicate
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="ml-auto gradient-primary"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          {isEditing ? "Update Session" : "Add Session"}
        </Button>
      </div>
    </div>
  )
}
