"use client"

import { useState } from "react"
import useSWR from "swr"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Search, Calendar, Activity, FolderOpen } from "lucide-react"
import Link from "next/link"
import { AthleteCard } from "./athlete-card"
import { AddAthleteDialog } from "./add-athlete-dialog"
import { AssignWorkoutDialog } from "./assign-workout-dialog"
import { CoachDashboardSkeleton } from "@/components/ui/skeletons"

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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function CoachDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [addAthleteOpen, setAddAthleteOpen] = useState(false)
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])

  const { data, error, isLoading, mutate } = useSWR<{ athletes: Athlete[] }>(
    "/api/coach/athletes",
    fetcher
  )

  const athletes = data?.athletes || []
  const filteredAthletes = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.sport?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.team?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const athletesWithCheckin = athletes.filter((a) => a.todays_checkin).length
  const averageWellness = athletes.length > 0
    ? Math.round(
        athletes
          .filter((a) => a.todays_checkin)
          .reduce((sum, a) => {
            const checkin = a.todays_checkin!
            return sum + (checkin.mental_state + checkin.physical_state) / 2
          }, 0) / (athletesWithCheckin || 1)
      )
    : null

  const toggleAthleteSelection = (id: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedAthletes(filteredAthletes.map((a) => a.id))
  }

  const clearSelection = () => {
    setSelectedAthletes([])
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Coach Portal
          </h1>
          <p className="text-muted-foreground">Manage your athletes and assign workouts</p>
        </div>
        <div className="flex gap-2">
          <Link href="/coach/groups">
            <Button variant="outline">
              <FolderOpen className="h-4 w-4 mr-2" />
              Groups
            </Button>
          </Link>
          <Button onClick={() => setAddAthleteOpen(true)} variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Athlete
          </Button>
          {selectedAthletes.length > 0 && (
            <Button onClick={() => setAssignWorkoutOpen(true)} className="gradient-primary">
              <Calendar className="h-4 w-4 mr-2" />
              Assign Workout ({selectedAthletes.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-primary">{athletes.length}</div>
          <div className="text-sm text-muted-foreground">Total Athletes</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-success">{athletesWithCheckin}</div>
          <div className="text-sm text-muted-foreground">Checked In Today</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-warning">
            {averageWellness !== null ? `${averageWellness}/10` : "—"}
          </div>
          <div className="text-sm text-muted-foreground">Avg Wellness</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-accent">
            {athletes.reduce((sum, a) => sum + a.upcoming_sessions, 0)}
          </div>
          <div className="text-sm text-muted-foreground">Sessions This Week</div>
        </GlassCard>
      </div>

      {/* Search and Selection Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50"
          />
        </div>
        <div className="flex gap-2 items-center">
          {selectedAthletes.length > 0 && (
            <Badge variant="secondary">{selectedAthletes.length} selected</Badge>
          )}
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          {selectedAthletes.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Athletes List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-4 w-4 bg-muted rounded mt-1" />
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-40 bg-muted rounded" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="text-center py-8">
          <p className="text-destructive">Failed to load athletes</p>
        </GlassCard>
      ) : filteredAthletes.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No athletes yet</h3>
          <p className="text-muted-foreground mb-4">
            Add athletes to your roster to start tracking their progress
          </p>
          <Button onClick={() => setAddAthleteOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Your First Athlete
          </Button>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAthletes.map((athlete) => (
            <AthleteCard
              key={athlete.id}
              athlete={athlete}
              selected={selectedAthletes.includes(athlete.id)}
              onSelect={() => toggleAthleteSelection(athlete.id)}
              onRemove={() => mutate()}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddAthleteDialog
        open={addAthleteOpen}
        onOpenChange={setAddAthleteOpen}
        onSuccess={() => mutate()}
      />

      <AssignWorkoutDialog
        open={assignWorkoutOpen}
        onOpenChange={setAssignWorkoutOpen}
        selectedAthleteIds={selectedAthletes}
        athletes={athletes}
        onSuccess={() => {
          mutate()
          clearSelection()
        }}
      />
    </div>
  )
}
