"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const

interface Course {
  id: string
  name: string
  code: string
  instructor: string
  schedule: string
  meeting_days: string[] | null
}

interface EditCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  course: Course | null
}

export function EditCourseDialog({ open, onOpenChange, onSuccess, course }: EditCourseDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    instructor: "",
    schedule: "",
    meeting_days: [] as string[],
  })

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name || "",
        code: course.code || "",
        instructor: course.instructor || "",
        schedule: course.schedule || "",
        meeting_days: course.meeting_days || [],
      })
    }
  }, [course])

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      meeting_days: prev.meeting_days.includes(day)
        ? prev.meeting_days.filter((d) => d !== day)
        : [...prev.meeting_days, day],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!course) return
    setIsLoading(true)

    try {
      await fetch(`/api/athletes/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          meeting_days: formData.meeting_days.length > 0 ? formData.meeting_days : null,
        }),
      })

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update course:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">Edit Course</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Course Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Introduction to Physics"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-code">Course Code</Label>
            <Input
              id="edit-code"
              placeholder="e.g., PHYS 201"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-instructor">Instructor</Label>
            <Input
              id="edit-instructor"
              placeholder="e.g., Dr. Smith"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label>Meeting Days</Label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex-1 py-1.5 px-1 rounded-md text-xs font-medium transition-all border",
                    formData.meeting_days.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/50"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-schedule">Time</Label>
            <Input
              id="edit-schedule"
              placeholder="e.g., 10:00 AM - 11:15 AM"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              className="bg-secondary/50 border-border/50"
            />
          </div>

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
