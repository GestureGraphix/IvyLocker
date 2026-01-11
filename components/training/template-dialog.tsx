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
import { Switch } from "@/components/ui/switch"
import { Loader2, ChevronDown, Plus, Trash2, Dumbbell, Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SetInput {
  reps: number
  weight?: number
  rpe?: number
}

interface ExerciseInput {
  name: string
  notes: string
  quickEntry: string
  sets: SetInput[]
}

interface ScheduleInput {
  enabled: boolean
  weekdays: number[]
  start_time: string
  end_date: string
}

interface Template {
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
}

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  template?: Template | null
}

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
]

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

  return Array.from({ length: numSets }, () => ({ reps, weight, rpe }))
}

export function TemplateDialog({ open, onOpenChange, onSuccess, template }: TemplateDialogProps) {
  const isEditing = !!template
  const [isLoading, setIsLoading] = useState(false)
  const [exercisesOpen, setExercisesOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    type: "strength",
    duration_minutes: "60",
    intensity: "medium",
    focus: "",
    notes: "",
  })

  const [exercises, setExercises] = useState<ExerciseInput[]>([])
  const [schedule, setSchedule] = useState<ScheduleInput>({
    enabled: false,
    weekdays: [],
    start_time: "09:00",
    end_date: "",
  })

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        type: template.type,
        duration_minutes: template.duration_minutes?.toString() || "60",
        intensity: template.intensity || "medium",
        focus: template.focus || "",
        notes: template.notes || "",
      })

      if (template.exercises && template.exercises.length > 0) {
        setExercises(template.exercises.map(ex => ({
          name: ex.name,
          notes: ex.notes || "",
          quickEntry: "",
          sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight, rpe: s.rpe }))
        })))
        setExercisesOpen(true)
      } else {
        setExercises([])
      }

      if (template.schedule) {
        setSchedule({
          enabled: template.schedule.enabled,
          weekdays: template.schedule.weekdays || [],
          start_time: template.schedule.start_time || "09:00",
          end_date: template.schedule.end_date || "",
        })
        setScheduleOpen(template.schedule.enabled)
      } else {
        setSchedule({ enabled: false, weekdays: [], start_time: "09:00", end_date: "" })
      }
    } else {
      // Reset form for new template
      setFormData({
        name: "",
        type: "strength",
        duration_minutes: "60",
        intensity: "medium",
        focus: "",
        notes: "",
      })
      setExercises([])
      setSchedule({ enabled: false, weekdays: [], start_time: "09:00", end_date: "" })
      setExercisesOpen(false)
      setScheduleOpen(false)
    }
  }, [template, open])

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
    })
    setExercises(updated)
  }

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets = updated[exerciseIndex].sets.filter((_, i) => i !== setIndex)
    setExercises(updated)
  }

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetInput, value: number | undefined) => {
    const updated = [...exercises]
    updated[exerciseIndex].sets[setIndex] = { ...updated[exerciseIndex].sets[setIndex], [field]: value }
    setExercises(updated)
  }

  const toggleWeekday = (day: number) => {
    setSchedule(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter(d => d !== day)
        : [...prev.weekdays, day].sort((a, b) => a - b)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const validExercises = exercises
        .filter(ex => ex.name.trim())
        .map(ex => ({
          name: ex.name,
          notes: ex.notes || undefined,
          sets: ex.sets.filter(s => s.reps > 0).map(s => ({
            reps: s.reps,
            weight: s.weight || undefined,
            rpe: s.rpe || undefined,
          }))
        }))

      const scheduleData = schedule.enabled && schedule.weekdays.length > 0
        ? {
            enabled: true,
            weekdays: schedule.weekdays,
            start_time: schedule.start_time,
            end_date: schedule.end_date || undefined,
          }
        : undefined

      const payload = {
        name: formData.name,
        type: formData.type,
        duration_minutes: parseInt(formData.duration_minutes),
        intensity: formData.intensity,
        focus: formData.focus || undefined,
        notes: formData.notes || undefined,
        exercises: validExercises.length > 0 ? validExercises : undefined,
        schedule: scheduleData,
      }

      const url = isEditing ? `/api/athletes/templates/${template.id}` : "/api/athletes/templates"
      const method = isEditing ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success(isEditing ? "Template updated successfully" : "Template created successfully")
        onSuccess()
        onOpenChange(false)
      } else if (res.status === 401) {
        toast.error("Please log in to create templates")
      } else {
        toast.error(isEditing ? "Failed to update template" : "Failed to create template")
      }
    } catch (error) {
      console.error("Template error:", error)
      toast.error("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">
            {isEditing ? "Edit Template" : "Create Training Template"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="e.g., Push Day A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="300"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                required
                className="bg-secondary/50 border-border/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus">Focus Area</Label>
              <Input
                id="focus"
                placeholder="e.g., Chest, Back"
                value={formData.focus}
                onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Template notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-secondary/50 border-border/50 resize-none"
              rows={2}
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

                  <div className="flex gap-2">
                    <Input
                      placeholder="Quick entry: 5x5 @ 225"
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
                    <Button type="button" variant="outline" onClick={() => applyQuickEntry(exerciseIndex)} className="shrink-0">
                      Apply
                    </Button>
                  </div>

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

                  <Button type="button" variant="outline" size="sm" onClick={() => addSet(exerciseIndex)} className="w-full">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Set
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addExercise} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Schedule Section */}
          <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-secondary/30 border-border/50 hover:bg-secondary/50"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Weekly Schedule {schedule.enabled && schedule.weekdays.length > 0 && "(Active)"}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${scheduleOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-enabled">Enable Recurring Schedule</Label>
                <Switch
                  id="schedule-enabled"
                  checked={schedule.enabled}
                  onCheckedChange={(checked) => setSchedule({ ...schedule, enabled: checked })}
                />
              </div>

              {schedule.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Repeat on</Label>
                    <div className="flex gap-2 flex-wrap">
                      {WEEKDAYS.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWeekday(day.value)}
                          className={cn(
                            "w-11 h-11 font-semibold transition-all",
                            schedule.weekdays.includes(day.value)
                              ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-2 ring-offset-background hover:bg-primary/90"
                              : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                          )}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start-time" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Start Time
                      </Label>
                      <Input
                        id="start-time"
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => setSchedule({ ...schedule, start_time: e.target.value })}
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="end-date">End Date (Optional)</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={schedule.end_date}
                        onChange={(e) => setSchedule({ ...schedule, end_date: e.target.value })}
                        className="bg-secondary/50 border-border/50"
                      />
                    </div>
                  </div>
                </>
              )}
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
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
