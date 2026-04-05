"use client"

import { useState } from "react"
import useSWR from "swr"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Search, Calendar, Activity, Video } from "lucide-react"
import { AthleteCard } from "./athlete-card"
import { AddAthleteDialog } from "./add-athlete-dialog"
import { AssignWorkoutDialog } from "./assign-workout-dialog"
import { ScheduleMeetingDialog } from "./schedule-meeting-dialog"

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

function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub: string
  accent?: string
}) {
  return (
    <div className="px-[18px] py-4" style={{ borderRight: "1px solid var(--rule)" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", lineHeight: 1, color: accent ?? "var(--ink)", letterSpacing: "-0.5px" }}>
        {value}
      </p>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "3px" }}>{sub}</p>
    </div>
  )
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function CoachDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [addAthleteOpen, setAddAthleteOpen] = useState(false)
  const [assignWorkoutOpen, setAssignWorkoutOpen] = useState(false)
  const [meetingOpen, setMeetingOpen] = useState(false)
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

  const toggleAthleteSelection = (id: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => setSelectedAthletes(filteredAthletes.map((a) => a.id))
  const clearSelection = () => setSelectedAthletes([])

  return (
    <div className="p-6 md:p-7 space-y-5">
      {/* Page title */}
      <div>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", letterSpacing: "1px", color: "var(--ink)" }}>
          Athletes
        </h1>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted-foreground)", marginTop: "2px" }}>
          Coach Portal · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </p>
      </div>

      {/* Stats strip */}
      <div
        className="grid grid-cols-3 bg-white overflow-hidden"
        style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
      >
        <StatCell label="Athletes"    value={athletes.length}          sub="on roster"    />
        <StatCell label="Checked In"  value={athletesWithCheckin}      sub="today"        accent="var(--ivy-mid)" />
        <StatCell label="Sessions"    value={athletes.reduce((s, a) => s + a.upcoming_sessions, 0)} sub="this week" accent="var(--gold)" />
      </div>

      {/* Search + controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
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
          <Button onClick={() => setMeetingOpen(true)} variant="outline">
            <Video className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
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

      {/* Athletes list */}
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
      <ScheduleMeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        athletes={athletes}
        onSuccess={() => mutate()}
      />
    </div>
  )
}
