"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Clock, Check, MoreVertical, Pencil, Trash2, UserCheck } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditSessionDialog } from "./edit-session-dialog"

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
  assigned_by?: string | null
}

interface SessionCardProps {
  session: Session
  onUpdate: () => void
}

export function SessionCard({ session, onUpdate }: SessionCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const startTime = new Date(session.start_at)
  const endTime = new Date(session.end_at)
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

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

  const handleToggleComplete = async () => {
    setIsCompleting(true)
    try {
      await fetch(`/api/athletes/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !session.completed }),
      })
      onUpdate()
    } catch (error) {
      console.error("Failed to update session:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this session?")) return

    try {
      await fetch(`/api/athletes/sessions/${session.id}`, {
        method: "DELETE",
      })
      onUpdate()
    } catch (error) {
      console.error("Failed to delete session:", error)
    }
  }

  return (
    <GlassCard className={cn("transition-all", session.completed && "opacity-75")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Complete checkbox */}
          <button
            onClick={handleToggleComplete}
            disabled={isCompleting}
            className={cn(
              "mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
              session.completed
                ? "bg-success border-success text-white"
                : "border-muted-foreground hover:border-primary",
            )}
          >
            {session.completed && <Check className="h-4 w-4" />}
          </button>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={cn(
                  "font-semibold text-foreground",
                  session.completed && "line-through text-muted-foreground",
                )}
              >
                {session.title}
              </h3>
              <Badge
                variant="outline"
                className={cn(typeColors[session.type as keyof typeof typeColors] || typeColors.strength)}
              >
                {session.type}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  intensityColors[session.intensity as keyof typeof intensityColors] || intensityColors.medium,
                )}
              >
                {session.intensity}
              </Badge>
              {session.assigned_by && (
                <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Coach Assigned
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
              <span>{duration} min</span>
              <span>{startTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
            </div>

            {session.focus && <p className="text-sm text-muted-foreground">Focus: {session.focus}</p>}

            {session.notes && (
              <p className="text-sm text-foreground/80 bg-secondary/50 px-3 py-2 rounded-lg">{session.notes}</p>
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
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <EditSessionDialog
        session={session}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={onUpdate}
      />
    </GlassCard>
  )
}
