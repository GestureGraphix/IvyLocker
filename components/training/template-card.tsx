"use client"

import { useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  Dumbbell,
  Play,
  RefreshCw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TemplateDialog } from "./template-dialog"

interface SetData {
  reps: number
  weight?: number
  rpe?: number
}

interface ExerciseData {
  name: string
  notes?: string
  sets: SetData[]
}

interface Schedule {
  enabled: boolean
  weekdays: number[]
  start_time: string
  end_date?: string
}

interface Template {
  id: string
  name: string
  type: string
  duration_minutes: number
  intensity: string
  focus?: string
  notes?: string
  exercises?: ExerciseData[]
  schedule?: Schedule
}

interface TemplateCardProps {
  template: Template
  onUpdate: () => void
  onSessionCreated?: () => void
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function TemplateCard({ template, onUpdate, onSessionCreated }: TemplateCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const typeColors = {
    strength: "bg-warning/20 text-warning border-warning/30",
    conditioning: "bg-success/20 text-success border-success/30",
    practice: "bg-primary/20 text-primary border-primary/30",
    competition: "bg-accent/20 text-accent border-accent/30",
  }

  const intensityColors = {
    low: "border-success text-success",
    medium: "border-warning text-warning",
    high: "border-destructive text-destructive",
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      const res = await fetch(`/api/athletes/templates/${template.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        toast.success("Template deleted")
        onUpdate()
      } else {
        toast.error("Failed to delete template")
      }
    } catch (error) {
      console.error("Failed to delete template:", error)
      toast.error("Failed to delete template")
    }
  }

  const handleCreateSession = async () => {
    setIsCreating(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const res = await fetch(`/api/athletes/templates/${template.id}/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          start_time: template.schedule?.start_time || "09:00",
        }),
      })

      if (res.ok) {
        toast.success("Session created from template")
        onSessionCreated?.()
      } else {
        toast.error("Failed to create session")
      }
    } catch (error) {
      console.error("Failed to create session:", error)
      toast.error("Failed to create session")
    } finally {
      setIsCreating(false)
    }
  }

  const handleGenerateSessions = async () => {
    if (!template.schedule?.enabled) {
      toast.error("Enable a schedule first")
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch(`/api/athletes/templates/${template.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeks: 4 }),
      })

      const data = await res.json()

      if (res.ok) {
        if (data.created?.length > 0) {
          toast.success(`Generated ${data.created.length} sessions`)
          onSessionCreated?.()
        } else {
          toast.info(data.message || "No new sessions to generate")
        }
      } else {
        toast.error(data.error || "Failed to generate sessions")
      }
    } catch (error) {
      console.error("Failed to generate sessions:", error)
      toast.error("Failed to generate sessions")
    } finally {
      setIsGenerating(false)
    }
  }

  const totalSets = template.exercises?.reduce((acc, ex) => acc + ex.sets.length, 0) || 0
  const exerciseCount = template.exercises?.length || 0

  return (
    <GlassCard className="transition-all hover:border-primary/30">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{template.name}</h3>
            <Badge
              variant="outline"
              className={cn(typeColors[template.type as keyof typeof typeColors] || typeColors.strength)}
            >
              {template.type}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                intensityColors[template.intensity as keyof typeof intensityColors] || intensityColors.medium,
              )}
            >
              {template.intensity}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {template.duration_minutes} min
            </span>
            {exerciseCount > 0 && (
              <span className="flex items-center gap-1">
                <Dumbbell className="h-4 w-4" />
                {exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}
                {totalSets > 0 && ` (${totalSets} sets)`}
              </span>
            )}
          </div>

          {template.focus && (
            <p className="text-sm text-muted-foreground">Focus: {template.focus}</p>
          )}

          {/* Schedule info */}
          {template.schedule?.enabled && template.schedule.weekdays.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">
                {template.schedule.weekdays.map(d => WEEKDAY_LABELS[d]).join(", ")}
              </span>
              <span className="text-muted-foreground">at {template.schedule.start_time}</span>
              {template.schedule.end_date && (
                <span className="text-muted-foreground">
                  until {new Date(template.schedule.end_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateSession}
              disabled={isCreating}
              className="text-xs"
            >
              {isCreating ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Start Session
            </Button>
            {template.schedule?.enabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSessions}
                disabled={isGenerating}
                className="text-xs"
              >
                {isGenerating ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Calendar className="h-3 w-3 mr-1" />
                )}
                Generate 4 Weeks
              </Button>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateSession} disabled={isCreating}>
              <Copy className="h-4 w-4 mr-2" />
              Create Session Now
            </DropdownMenuItem>
            {template.schedule?.enabled && (
              <DropdownMenuItem onClick={handleGenerateSessions} disabled={isGenerating}>
                <Calendar className="h-4 w-4 mr-2" />
                Generate Scheduled Sessions
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TemplateDialog
        template={template}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={onUpdate}
      />
    </GlassCard>
  )
}
