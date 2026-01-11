"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Loader2, ChevronDown, Plus, Trash2, Dumbbell } from "lucide-react"

interface SetData {
  id?: string
  reps: number
  weight?: number
  rpe?: number
  completed: boolean
}

interface ExerciseData {
  id?: string
  name: string
  notes?: string
  sets: SetData[]
}

interface Session {
  id: string
  type: string
  title: string
  start_at: string
  end_at: string
  intensity: string
  focus: string
  notes: string
  completed: boolean
  exercises?: ExerciseData[]
}

interface SetInput {
  reps: number
  weight?: number
  rpe?: number
  completed: boolean
}

interface ExerciseInput {
  name: string
  notes: string
  quickEntry: string
  sets: SetInput[]
}

interface EditSessionDialogProps {
  session: Session | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function parseQuickEntry(input: string): SetInput[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  const match = trimmed.match(/^(\d+)\s*[xX]\s*(\d+)(?:\s*[@]?\s*(\d+(?:\.\d+)?))?\s*(?:RPE\s*(\d+))?$/i)

  if (!match) return []

  const numSets = parseInt(match[1], 10)
  const reps = parseInt(match[2], 10)
  const weight = match[3] ? parseFloat(match[3]) : undefined
  const rpe = match[4] ? parseInt(match[4], 10) : undefined

  if (numSets < 1 || numSets > 20 || reps < 1) return []

  return Array.from({ length: numSets }, () => ({
    reps,
    weight,
    rpe,
    completed: false
  }))
}

export function EditSessionDialog({ session, open, onOpenChange, onSuccess }: EditSessionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [exercisesOpen, setExercisesOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    type: "strength",
    date: "",
    startTime: "09:00",
    duration: "60",
    intensity: "medium",
    focus: "",
    notes: "",
  })
  const [exercises, setExercises] = useState<ExerciseInput[]>([])

  useEffect(() => {
    if (session) {
      const startDate = new Date(session.start_at)
      const endDate = new Date(session.end_at)
      const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))

      setFormData({
        title: session.title,
        type: session.type,
        date: startDate.toISOString().split("T")[0],
        startTime: startDate.toTimeString().slice(0, 5),
        duration: duration.toString(),
        intensity: session.intensity,
        focus: session.focus || "",
        notes: session.notes || "",
      })

      // Load exercises
      if (session.exercises && session.exercises.length > 0) {
        setExercises(session.exercises.map(ex => ({
          name: ex.name,
          notes: ex.notes || "",
          quickEntry: "",
          sets: ex.sets.map(s => ({
            reps: s.reps,
            weight: s.weight,
            rpe: s.rpe,
            completed: s.completed
          }))
        })))
        setExercisesOpen(true)
      } else {
        setExercises([])
        setExercisesOpen(false)
      }
    }
  }, [session])

  const addExercise = () => {
    setExercises([...exercises, { name: "", notes: "", quickEntry: "", sets: [] }])
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const updateExercise = (index: number, field: keyof ExerciseInput, value: string) => {
    const updated = [...exercises]
    updated[index] = { ...updated[index], [field]: value }
    setExercises(updated)
  }

  const applyQuickEntry = (exerciseIndex: number) => {
    const exercise = exercises[exerciseIndex]
    const parsedSets = parseQuickEntry(exercise.quickEntry)
    if (parsedSets.length > 0) {
      const updated = [...exercises]
      updated[exerciseIndex] = { ...updated[exerciseIndex], sets: parsedSets, quickEntry: "" }
      setExercises(updated)
    } else if (exercise.quickEntry.trim()) {
      toast.error("Invalid format. Try: 5x5 @ 225 or 3x12")
    }
  }

  const addSet = (exerciseIndex: number) => {
    const updated = [...exercises]
    const lastSet = updated[exerciseIndex].sets[updated[exerciseIndex].sets.length - 1]
    updated[exerciseIndex].sets.push({
      reps: lastSet?.reps || 10,
      weight: lastSet?.weight,
      rpe: lastSet?.rpe,
      completed: false
    })
    setExercises(updated)
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    setExercises(updated)
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetInput, value: number | boolean | undefined) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex], [field]: value }
    setExercises(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setIsLoading(true)

    try {
      const startAt = new Date(`${formData.date}T${formData.startTime}`)
      const endAt = new Date(startAt.getTime() + Number.parseInt(formData.duration) * 60 * 1000)

      const validExercises = exercises
        .filter(ex => ex.name.trim())
        .map(ex => ({
          name: ex.name,
          notes: ex.notes || undefined,
          sets: ex.sets.filter(s => s.reps > 0).map(s => ({
            reps: s.reps,
            weight: s.weight || undefined,
            rpe: s.rpe || undefined,
            completed: s.completed
          }))
        }))

      const res = await fetch(`/api/athletes/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          intensity: formData.intensity,
          focus: formData.focus,
          notes: formData.notes,
          exercises: validExercises,
        }),
      })

      if (res.ok) {
        toast.success("Session updated successfully")
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error("Failed to update session")
      }
    } catch (error) {
      console.error("Failed to update session:", error)
      toast.error("Failed to update session")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">Edit Training Session</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              placeholder="e.g., Upper Body Strength"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="conditioning">Conditioning</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intensity">Intensity</Label>
              <Select
                value={formData.intensity}
                onValueChange={(value) => setFormData({ ...formData, intensity: value })}
              >
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
                className="bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="300"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                required
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus">Focus Area</Label>
            <Input
              id="focus"
              placeholder="e.g., Chest, Shoulders, Triceps"
              value={formData.focus}
              onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes for this session..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-secondary/50 border-border/50 resize-none"
              rows={3}
            />
          </div>

          {/* Exercises Section */}
          <Collapsible open={exercisesOpen} onOpenChange={setExercisesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-secondary/30 border-border/50 hover:bg-secondary/50"
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Exercises {exercises.length > 0 && `(${exercises.length})`}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${exercisesOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-4 space-y-4">
              {exercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Exercise name"
                      value={exercise.name}
                      onChange={(e) => updateExercise(exerciseIndex, "name", e.target.value)}
                      className="bg-secondary/50 border-border/50 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(exerciseIndex)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Input
                    placeholder="Notes (optional)"
                    value={exercise.notes}
                    onChange={(e) => updateExercise(exerciseIndex, "notes", e.target.value)}
                    className="bg-secondary/50 border-border/50"
                  />

                  {/* Quick Entry */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Quick entry: 5x5 @ 225 or 3x12"
                      value={exercise.quickEntry}
                      onChange={(e) => updateExercise(exerciseIndex, "quickEntry", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          applyQuickEntry(exerciseIndex)
                        }
                      }}
                      className="bg-secondary/50 border-border/50 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => applyQuickEntry(exerciseIndex)}
                      className="shrink-0"
                    >
                      Apply
                    </Button>
                  </div>

                  {/* Sets */}
                  {exercise.sets.length > 0 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground px-1">
                        <span>Reps</span>
                        <span>Weight</span>
                        <span>RPE</span>
                        <span className="w-8"></span>
                      </div>
                      {exercise.sets.map((set, setIndex) => (
                        <div key={setIndex} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                          <Input
                            type="number"
                            min="1"
                            value={set.reps}
                            onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                            className="bg-secondary/50 border-border/50 h-9"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="-"
                            value={set.weight || ""}
                            onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="bg-secondary/50 border-border/50 h-9"
                          />
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            placeholder="-"
                            value={set.rpe || ""}
                            onChange={(e) => updateSet(exerciseIndex, setIndex, "rpe", e.target.value ? parseInt(e.target.value) : undefined)}
                            className="bg-secondary/50 border-border/50 h-9"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSet(exerciseIndex, setIndex)}
                            className="h-9 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addSet(exerciseIndex)}
                    className="w-full"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Set
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addExercise}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 gradient-primary glow-primary">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
