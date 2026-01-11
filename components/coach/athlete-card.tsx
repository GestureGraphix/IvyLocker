"use client"

import { useState } from "react"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, User, Calendar, Heart, Brain, Trash2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface Athlete {
  id: string
  name: string
  email: string
  sport?: string
  team?: string
  position?: string
  university?: string
  tags?: string[]
  linked_at: string
  todays_checkin?: {
    mental_state: number
    physical_state: number
    date: string
  } | null
  upcoming_sessions: number
}

interface AthleteCardProps {
  athlete: Athlete
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}

export function AthleteCard({ athlete, selected, onSelect, onRemove }: AthleteCardProps) {
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = async () => {
    if (!confirm(`Remove ${athlete.name} from your roster?`)) return

    setIsRemoving(true)
    try {
      await fetch(`/api/coach/athletes?athleteId=${athlete.id}`, {
        method: "DELETE",
      })
      onRemove()
    } catch (error) {
      console.error("Failed to remove athlete:", error)
    } finally {
      setIsRemoving(false)
    }
  }

  const wellnessScore = athlete.todays_checkin
    ? Math.round((athlete.todays_checkin.mental_state + athlete.todays_checkin.physical_state) / 2)
    : null

  const wellnessColor =
    wellnessScore === null
      ? "text-muted-foreground"
      : wellnessScore >= 7
        ? "text-success"
        : wellnessScore >= 4
          ? "text-warning"
          : "text-destructive"

  return (
    <GlassCard
      className={cn(
        "transition-all cursor-pointer hover:border-primary/50",
        selected && "border-primary ring-2 ring-primary/20"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <span className="text-white font-semibold">
              {athlete.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate">{athlete.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{athlete.email}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/coach/athletes/${athlete.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleRemove}
              disabled={isRemoving}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from Roster
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sport/Team Info */}
      <div className="mt-3 flex flex-wrap gap-2">
        {athlete.sport && (
          <Badge variant="outline" className="text-xs">
            {athlete.sport}
          </Badge>
        )}
        {athlete.team && (
          <Badge variant="secondary" className="text-xs">
            {athlete.team}
          </Badge>
        )}
        {athlete.position && (
          <Badge variant="secondary" className="text-xs">
            {athlete.position}
          </Badge>
        )}
      </div>

      {/* Stats Row */}
      <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className={cn("text-lg font-bold", wellnessColor)}>
            {wellnessScore !== null ? wellnessScore : "—"}
          </div>
          <div className="text-xs text-muted-foreground">Wellness</div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary">{athlete.upcoming_sessions}</div>
          <div className="text-xs text-muted-foreground">Sessions</div>
        </div>
        <div>
          <div className={cn("text-lg font-bold", athlete.todays_checkin ? "text-success" : "text-muted-foreground")}>
            {athlete.todays_checkin ? "Yes" : "No"}
          </div>
          <div className="text-xs text-muted-foreground">Checked In</div>
        </div>
      </div>

      {/* Check-in Details */}
      {athlete.todays_checkin && (
        <div className="mt-3 flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Brain className="h-3 w-3" />
            Mental: {athlete.todays_checkin.mental_state}/10
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Heart className="h-3 w-3" />
            Physical: {athlete.todays_checkin.physical_state}/10
          </span>
        </div>
      )}

      {/* View Details Link */}
      <Link
        href={`/coach/athletes/${athlete.id}`}
        className="mt-3 block text-center text-sm text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        View Full Dashboard →
      </Link>
    </GlassCard>
  )
}
