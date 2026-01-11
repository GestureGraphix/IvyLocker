"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, X } from "lucide-react"

interface Athlete {
  id: string
  name: string
}

interface AssignWorkoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAthleteIds: string[]
  athletes: Athlete[]
  onSuccess: () => void
}

export function AssignWorkoutDialog({
  open,
  onOpenChange,
  selectedAthleteIds,
  athletes,
  onSuccess,
}: AssignWorkoutDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    type: "strength",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    duration: "60",
    intensity: "medium",
    focus: "",
    notes: "",
  })

  const selectedAthletes = athletes.filter((a) => selectedAthleteIds.includes(a.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const startAt = new Date(`${formData.date}T${formData.startTime}`)
      const endAt = new Date(startAt.getTime() + Number.parseInt(formData.duration) * 60 * 1000)

      const res = await fetch("/api/coach/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteIds: selectedAthleteIds,
          title: formData.title,
          type: formData.type,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          intensity: formData.intensity,
          focus: formData.focus || null,
          notes: formData.notes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to assign workout")
        return
      }

      toast.success(`Workout assigned to ${selectedAthleteIds.length} athlete(s)`)
      // Reset form and close
      setFormData({
        title: "",
        type: "strength",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        duration: "60",
        intensity: "medium",
        focus: "",
        notes: "",
      })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to assign workout")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Assign Workout
          </DialogTitle>
        </DialogHeader>

        {/* Selected Athletes */}
        <div className="space-y-2">
          <Label>Assigning to ({selectedAthletes.length} athletes)</Label>
          <div className="flex flex-wrap gap-2">
            {selectedAthletes.map((athlete) => (
              <Badge key={athlete.id} variant="secondary" className="text-sm">
                {athlete.name}
              </Badge>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Workout Title</Label>
            <Input
              id="title"
              placeholder="e.g., Upper Body Strength"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-secondary/50 border-border/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
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
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="bg-secondary/50 border-border/50"
                required
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
                className="bg-secondary/50 border-border/50"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="focus">Focus Area (optional)</Label>
            <Input
              id="focus"
              placeholder="e.g., Chest, Shoulders, Triceps"
              value={formData.focus}
              onChange={(e) => setFormData({ ...formData, focus: e.target.value })}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Instructions or notes for the athletes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-secondary/50 border-border/50 resize-none"
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.title}
              className="flex-1 gradient-primary glow-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Assign Workout
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
