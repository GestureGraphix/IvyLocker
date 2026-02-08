"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { BookOpen, Trash2, Clock, User, CalendarDays } from "lucide-react"

interface Course {
  id: string
  name: string
  code: string
  instructor: string
  schedule: string
  meeting_days: string[] | null
}

interface CourseListProps {
  courses: Course[]
  onUpdate: () => void
}

export function CourseList({ courses, onUpdate }: CourseListProps) {
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course? This will also delete all related assignments.")) return

    try {
      await fetch(`/api/athletes/courses/${id}`, { method: "DELETE" })
      onUpdate()
    } catch (error) {
      console.error("Failed to delete course:", error)
    }
  }

  if (courses.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No courses added</h3>
        <p className="text-muted-foreground">Add your courses to start tracking assignments</p>
      </GlassCard>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((course) => (
        <GlassCard key={course.id} className="relative group">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}>
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{course.name}</h3>
                <p className="text-sm text-muted-foreground">{course.code}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {course.instructor && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{course.instructor}</span>
                </div>
              )}
              {course.meeting_days && course.meeting_days.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>{course.meeting_days.join(", ")}</span>
                </div>
              )}
              {course.schedule && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{course.schedule}</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  )
}
