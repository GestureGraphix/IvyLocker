"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface Exercise {
  id: string
  name: string
  body_group: string
}

interface LogMobilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  exercises: Exercise[]
  selectedExercise: Exercise | null
}

export function LogMobilityDialog({
  open,
  onOpenChange,
  onSuccess,
  exercises,
  selectedExercise,
}: LogMobilityDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    exercise_id: "",
    duration_minutes: "10",
    notes: "",
  })

  useEffect(() => {
    if (selectedExercise) {
      setFormData((prev) => ({
        ...prev,
        exercise_id: selectedExercise.id,
      }))
    }
  }, [selectedExercise])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const exercise = exercises.find((ex) => ex.id === formData.exercise_id)
      await fetch("/api/athletes/mobility-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: formData.exercise_id,
          exercise_name: exercise?.name || "",
          body_group: exercise?.body_group || "",
          date: new Date().toISOString().split("T")[0],
          duration_minutes: Number.parseInt(formData.duration_minutes),
          notes: formData.notes,
        }),
      })

      onSuccess()
      onOpenChange(false)
      setFormData({
        exercise_id: "",
        duration_minutes: "10",
        notes: "",
      })
    } catch (error) {
      console.error("Failed to log mobility:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">Log Mobility Session</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exercise">Exercise</Label>
            <Select
              value={formData.exercise_id}
              onValueChange={(value) => setFormData({ ...formData, exercise_id: value })}
            >
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Select an exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name} ({exercise.body_group})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="120"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="How did it feel? Any tightness?"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-secondary/50 border-border/50 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.exercise_id}
              className="flex-1 gradient-primary glow-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Session"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
