"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Stethoscope, Users, Calendar, ClipboardList, LogOut,
  UserPlus, Trash2, Loader2, ChevronLeft, ChevronRight,
  Plus, X, Check, ChevronDown,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhysioAthlete {
  id: string
  name: string
  email: string
  sport?: string
  team?: string
  university?: string
  active_assignments: number
  linked_at: string
}

interface PhysioMeeting {
  id: string
  athlete_id: string
  athlete_name: string
  title: string
  notes?: string
  scheduled_at: string
  duration_minutes: number
  status: "scheduled" | "completed" | "cancelled"
}

interface Exercise {
  name: string
  sets?: string
  reps?: string
  notes?: string
}

interface PhysioAssignment {
  id: string
  athlete_id: string
  athlete_name: string
  title: string
  type: "prehab" | "rehab"
  description?: string
  exercises: Exercise[]
  frequency?: string
  duration_weeks?: number
  notes?: string
  status: "active" | "completed" | "paused"
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPLE = "#a78bfa"
const ORANGE = "#f97316"
const fetcher = (url: string) => fetch(url).then((r) => r.json())
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

// ─── Root Component ───────────────────────────────────────────────────────────

export function PhysioPortal() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<"roster" | "calendar" | "assignments">("roster")
  const [displayMonth, setDisplayMonth] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
  })

  const { data: ad, mutate: mutateAthletes } = useSWR<{ athletes: PhysioAthlete[] }>(
    "/api/physio/athletes", fetcher
  )
  const { data: md, mutate: mutateMeetings } = useSWR<{ meetings: PhysioMeeting[] }>(
    `/api/physio/meetings?month=${displayMonth}`, fetcher
  )
  const { data: asd, mutate: mutateAssignments } = useSWR<{ assignments: PhysioAssignment[] }>(
    "/api/physio/assignments", fetcher
  )

  const athletes = ad?.athletes ?? []
  const meetings = md?.meetings ?? []
  const assignments = asd?.assignments ?? []

  const totalActive = assignments.filter((a) => a.status === "active").length
  const upcomingMeetings = meetings.filter(
    (m) => m.status === "scheduled" && new Date(m.scheduled_at) >= new Date()
  ).length

  const TABS = [
    { key: "roster" as const, label: "Roster", Icon: Users },
    { key: "calendar" as const, label: "Calendar", Icon: Calendar },
    { key: "assignments" as const, label: "Assignments", Icon: ClipboardList },
  ]

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="flex items-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "1px", color: "var(--cream)" }}
          >
            <Stethoscope className="h-6 w-6" style={{ color: PURPLE }} />
            Physio Portal
          </h1>
          <p className="text-muted-foreground text-sm">Manage athletes, schedule meetings, and assign protocols</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="text-center">
          <div className="text-3xl font-bold" style={{ color: PURPLE }}>{athletes.length}</div>
          <div className="text-sm text-muted-foreground">Athletes</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold" style={{ color: ORANGE }}>{totalActive}</div>
          <div className="text-sm text-muted-foreground">Active Protocols</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold" style={{ color: PURPLE }}>{upcomingMeetings}</div>
          <div className="text-sm text-muted-foreground">Upcoming Meetings</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold" style={{ color: "var(--cream)" }}>
            {assignments.filter((a) => a.status === "completed").length}
          </div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
            style={{
              color: tab === key ? "var(--cream)" : "var(--muted-foreground)",
              borderBottom: `2px solid ${tab === key ? PURPLE : "transparent"}`,
              fontWeight: tab === key ? 500 : 400,
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "roster" && <RosterTab athletes={athletes} onUpdate={mutateAthletes} />}
      {tab === "calendar" && (
        <CalendarTab
          athletes={athletes}
          meetings={meetings}
          displayMonth={displayMonth}
          onMonthChange={setDisplayMonth}
          onUpdate={mutateMeetings}
        />
      )}
      {tab === "assignments" && (
        <AssignmentsTab
          athletes={athletes}
          assignments={assignments}
          onUpdate={mutateAssignments}
        />
      )}
    </div>
  )
}

// ─── Roster Tab ───────────────────────────────────────────────────────────────

function RosterTab({ athletes, onUpdate }: { athletes: PhysioAthlete[]; onUpdate: () => void }) {
  const [email, setEmail] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError("")
    setAdding(true)
    try {
      const res = await fetch("/api/physio/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to add athlete")
      setEmail("")
      onUpdate()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add")
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id)
    try {
      await fetch(`/api/physio/athletes?athleteId=${id}`, { method: "DELETE" })
      onUpdate()
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add athlete */}
      <GlassCard>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--cream)" }}>Add Athlete</p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            type="email"
            placeholder="athlete@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            {!adding && "Add"}
          </Button>
        </form>
        {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
      </GlassCard>

      {/* Athletes list */}
      {athletes.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No athletes yet. Add one above by email.</p>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map((a) => (
            <GlassCard key={a.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                  style={{ background: PURPLE }}
                >
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--cream)" }}>{a.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[a.sport, a.team].filter(Boolean).join(" · ") || a.email}
                  </p>
                  {a.active_assignments > 0 && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {a.active_assignments} active
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(a.id)}
                disabled={removing === a.id}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive"
              >
                {removing === a.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />
                }
              </Button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({
  athletes,
  meetings,
  displayMonth,
  onMonthChange,
  onUpdate,
}: {
  athletes: PhysioAthlete[]
  meetings: PhysioMeeting[]
  displayMonth: string
  onMonthChange: (m: string) => void
  onUpdate: () => void
}) {
  const [year, month] = displayMonth.split("-").map(Number)
  const today = new Date()
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    const n = new Date()
    if (n.getFullYear() === year && n.getMonth() + 1 === month) return n.getDate()
    return null
  })
  const [showForm, setShowForm] = useState(false)
  const [fAthleteId, setFAthleteId] = useState("")
  const [fTitle, setFTitle] = useState("")
  const [fDate, setFDate] = useState(() => new Date().toISOString().split("T")[0])
  const [fTime, setFTime] = useState("09:00")
  const [fDuration, setFDuration] = useState(60)
  const [fNotes, setFNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const meetingDaySet = new Set(
    meetings.map((m) => new Date(m.scheduled_at).toLocaleDateString("en-CA"))
  )

  function prevMonth() {
    const d = new Date(year, month - 2, 1)
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    setSelectedDay(null)
  }
  function nextMonth() {
    const d = new Date(year, month, 1)
    onMonthChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    setSelectedDay(null)
  }

  const selectedDateStr = selectedDay
    ? `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null

  const visibleMeetings = selectedDateStr
    ? meetings.filter((m) => new Date(m.scheduled_at).toLocaleDateString("en-CA") === selectedDateStr)
    : meetings.filter((m) => m.status === "scheduled" && new Date(m.scheduled_at) >= today).slice(0, 6)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError("")
    setSaving(true)
    try {
      const scheduledAt = new Date(`${fDate}T${fTime}`).toISOString()
      const res = await fetch("/api/physio/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: fAthleteId, title: fTitle || "Meeting", notes: fNotes || null, scheduledAt, durationMinutes: fDuration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to schedule")
      setShowForm(false)
      setFTitle(""); setFNotes(""); setFAthleteId("")
      onUpdate()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to schedule")
    } finally {
      setSaving(false)
    }
  }

  async function updateMeeting(id: string, status: "completed" | "cancelled") {
    await fetch(`/api/physio/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    onUpdate()
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Calendar grid */}
        <GlassCard className="p-0 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "2px", color: "var(--cream)" }}
            >
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-xs text-muted-foreground font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="h-14 border-b border-r border-border" />
              }
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const hasMeeting = meetingDaySet.has(dateStr)
              const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate()
              const isSelected = selectedDay === day

              return (
                <button
                  key={day}
                  onClick={() => { setSelectedDay(isSelected ? null : day); setFDate(dateStr) }}
                  className="h-14 flex flex-col items-center justify-start pt-1.5 border-b border-r border-border transition-colors hover:bg-secondary"
                  style={{ background: isSelected ? "rgba(167,139,250,0.15)" : undefined }}
                >
                  <span
                    className="h-6 w-6 flex items-center justify-center rounded-full text-xs"
                    style={{
                      background: isToday ? PURPLE : "transparent",
                      color: isToday ? "#fff" : isSelected ? PURPLE : "var(--cream)",
                      fontWeight: isToday || isSelected ? 600 : 400,
                    }}
                  >
                    {day}
                  </span>
                  {hasMeeting && (
                    <div className="h-1.5 w-1.5 rounded-full mt-0.5" style={{ background: PURPLE }} />
                  )}
                </button>
              )
            })}
          </div>
        </GlassCard>

        {/* Schedule form */}
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm" style={{ color: "var(--cream)" }}>Schedule Meeting</p>
            {showForm && (
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!showForm ? (
            <Button className="w-full gradient-primary" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Athlete</label>
                <select
                  value={fAthleteId}
                  onChange={(e) => setFAthleteId(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select athlete...</option>
                  {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Title</label>
                <Input placeholder="e.g. Initial assessment" value={fTitle} onChange={(e) => setFTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Date</label>
                  <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Time</label>
                  <Input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Duration</label>
                <div className="flex gap-1.5">
                  {[30, 45, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFDuration(d)}
                      className="flex-1 py-1.5 rounded text-xs transition-colors border border-border"
                      style={{ background: fDuration === d ? PURPLE : "transparent", color: fDuration === d ? "#fff" : "var(--muted-foreground)" }}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                <textarea
                  value={fNotes}
                  onChange={(e) => setFNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional..."
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground resize-none"
                />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              <Button type="submit" disabled={saving} className="w-full gradient-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Meeting
              </Button>
            </form>
          )}
        </GlassCard>
      </div>

      {/* Meeting list */}
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          {selectedDay ? `${MONTH_NAMES[month - 1]} ${selectedDay}` : "Upcoming Meetings"}
        </p>
        {visibleMeetings.length === 0 ? (
          <GlassCard className="text-center py-8">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">
              {selectedDay ? "No meetings on this day." : "No upcoming meetings."}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {visibleMeetings.map((m) => {
              const dt = new Date(m.scheduled_at)
              const dateLabel = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              const timeLabel = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              return (
                <GlassCard key={m.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-center w-10 flex-shrink-0">
                      <p className="text-xs text-muted-foreground uppercase">{dateLabel.split(" ")[0]}</p>
                      <p
                        className="leading-none"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px", color: "var(--cream)" }}
                      >
                        {dateLabel.split(" ")[1]}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border flex-shrink-0" />
                    <div className="min-w-0">
                      <p
                        className="font-medium text-sm truncate"
                        style={{
                          color: "var(--cream)",
                          textDecoration: m.status === "completed" ? "line-through" : "none",
                        }}
                      >
                        {m.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.athlete_name} · {timeLabel} · {m.duration_minutes}m
                      </p>
                    </div>
                  </div>
                  {m.status === "scheduled" && (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateMeeting(m.id, "completed")}
                        className="h-8 w-8 text-muted-foreground hover:text-green-400"
                        title="Mark complete"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateMeeting(m.id, "cancelled")}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {m.status !== "scheduled" && (
                    <Badge variant="secondary" className="flex-shrink-0 ml-3 capitalize">
                      {m.status}
                    </Badge>
                  )}
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Assignments Tab ──────────────────────────────────────────────────────────

function AssignmentsTab({
  athletes,
  assignments,
  onUpdate,
}: {
  athletes: PhysioAthlete[]
  assignments: PhysioAssignment[]
  onUpdate: () => void
}) {
  const [filterAthlete, setFilterAthlete] = useState("all")
  const [filterType, setFilterType] = useState<"all" | "prehab" | "rehab">("all")
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [fAthleteId, setFAthleteId] = useState("")
  const [fTitle, setFTitle] = useState("")
  const [fType, setFType] = useState<"prehab" | "rehab">("prehab")
  const [fDescription, setFDescription] = useState("")
  const [fExercises, setFExercises] = useState([{ name: "", sets: "", reps: "" }])
  const [fFrequency, setFFrequency] = useState("")
  const [fDurationWeeks, setFDurationWeeks] = useState("")
  const [fNotes, setFNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const filtered = assignments.filter((a) => {
    if (filterAthlete !== "all" && a.athlete_id !== filterAthlete) return false
    if (filterType !== "all" && a.type !== filterType) return false
    return true
  })

  function addExRow() { setFExercises((r) => [...r, { name: "", sets: "", reps: "" }]) }
  function removeExRow(i: number) { setFExercises((r) => r.filter((_, idx) => idx !== i)) }
  function updateEx(i: number, field: "name" | "sets" | "reps", value: string) {
    setFExercises((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  }

  function resetForm() {
    setFAthleteId(""); setFTitle(""); setFDescription("")
    setFExercises([{ name: "", sets: "", reps: "" }])
    setFFrequency(""); setFDurationWeeks(""); setFNotes("")
    setSaveError("")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveError("")
    setSaving(true)
    try {
      const exercises = fExercises.filter((ex) => ex.name.trim()).map((ex) => ({
        name: ex.name.trim(),
        ...(ex.sets && { sets: ex.sets }),
        ...(ex.reps && { reps: ex.reps }),
      }))
      const res = await fetch("/api/physio/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: fAthleteId, title: fTitle, type: fType,
          description: fDescription || null, exercises,
          frequency: fFrequency || null,
          duration_weeks: fDurationWeeks ? parseInt(fDurationWeeks) : null,
          notes: fNotes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      setShowForm(false); resetForm(); onUpdate()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(id: string, status: "active" | "completed" | "paused") {
    await fetch(`/api/physio/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    onUpdate()
  }

  async function deleteAssignment(id: string) {
    await fetch(`/api/physio/assignments/${id}`, { method: "DELETE" })
    onUpdate()
  }

  return (
    <div className="space-y-4">
      {/* Filters + new */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterAthlete}
            onChange={(e) => setFilterAthlete(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            <option value="all">All Athletes</option>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {(["all", "prehab", "rehab"] as const).map((t) => (
            <Button
              key={t}
              variant={filterType === t ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(t)}
              className="capitalize"
              style={filterType === t && t === "rehab" ? { background: ORANGE, borderColor: ORANGE } : filterType === t && t === "prehab" ? { background: PURPLE, borderColor: PURPLE } : {}}
            >
              {t}
            </Button>
          ))}
        </div>
        <Button
          onClick={() => { setShowForm((v) => !v); if (showForm) resetForm() }}
          variant={showForm ? "outline" : "default"}
          className={showForm ? "" : "gradient-primary"}
        >
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Cancel" : "New Assignment"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <GlassCard className="space-y-4">
          <p className="font-medium text-sm" style={{ color: "var(--cream)" }}>New Assignment</p>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Athlete</label>
                <select
                  value={fAthleteId}
                  onChange={(e) => setFAthleteId(e.target.value)}
                  required
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select...</option>
                  {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Type</label>
                <div className="flex gap-2">
                  {(["prehab", "rehab"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFType(t)}
                      className="flex-1 py-2 rounded-md text-sm capitalize transition-colors border border-border"
                      style={{ background: fType === t ? (t === "prehab" ? PURPLE : ORANGE) : "transparent", color: fType === t ? "#fff" : "var(--muted-foreground)" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Title</label>
              <Input placeholder="e.g. Hip stability protocol" value={fTitle} onChange={(e) => setFTitle(e.target.value)} required />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <textarea
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
                rows={2}
                placeholder="Overview of the protocol..."
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground">Exercises</label>
                <button type="button" onClick={addExRow} className="text-xs flex items-center gap-1" style={{ color: PURPLE }}>
                  <Plus className="h-3 w-3" /> Add row
                </button>
              </div>
              <div className="space-y-2">
                {fExercises.map((ex, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input placeholder="Exercise name" value={ex.name} onChange={(e) => updateEx(idx, "name", e.target.value)} className="flex-1" />
                    <Input placeholder="Sets" value={ex.sets} onChange={(e) => updateEx(idx, "sets", e.target.value)} style={{ width: "64px" }} />
                    <Input placeholder="Reps" value={ex.reps} onChange={(e) => updateEx(idx, "reps", e.target.value)} style={{ width: "64px" }} />
                    {fExercises.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeExRow(idx)} className="flex-shrink-0 text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Frequency</label>
                <Input placeholder="e.g. Daily, 3×/week" value={fFrequency} onChange={(e) => setFFrequency(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Duration (weeks)</label>
                <Input type="number" min={1} max={52} placeholder="e.g. 6" value={fDurationWeeks} onChange={(e) => setFDurationWeeks(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Clinical Notes</label>
              <textarea
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                rows={2}
                placeholder="Contraindications, progressions, restrictions..."
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground resize-none"
              />
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}

            <Button
              type="submit"
              disabled={saving}
              className="w-full"
              style={{ background: fType === "rehab" ? ORANGE : PURPLE, color: "#fff", borderColor: "transparent" }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Assignment
            </Button>
          </form>
        </GlassCard>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <GlassCard className="text-center py-12">
          <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No assignments yet. Create one above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              expanded={expandedId === a.id}
              onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
              onStatusChange={(s) => updateStatus(a.id, s)}
              onDelete={() => deleteAssignment(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AssignmentRow({
  assignment: a,
  expanded,
  onToggle,
  onStatusChange,
  onDelete,
}: {
  assignment: PhysioAssignment
  expanded: boolean
  onToggle: () => void
  onStatusChange: (s: "active" | "completed" | "paused") => void
  onDelete: () => void
}) {
  return (
    <GlassCard className="p-0 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Badge
            variant="secondary"
            style={{
              background: a.type === "rehab" ? "rgba(249,115,22,0.15)" : "rgba(167,139,250,0.15)",
              color: a.type === "rehab" ? ORANGE : PURPLE,
              border: "none",
            }}
          >
            {a.type}
          </Badge>
          {a.status !== "active" && (
            <Badge variant="secondary" className="capitalize">{a.status}</Badge>
          )}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: "var(--cream)" }}>{a.title}</p>
            <p className="text-xs text-muted-foreground">
              {a.athlete_name}{a.frequency ? ` · ${a.frequency}` : ""}
            </p>
          </div>
        </div>
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 ml-3 text-muted-foreground transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3 bg-secondary/30">
          {a.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{a.description}</p>
          )}
          {a.exercises?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Exercises</p>
              {a.exercises.map((ex, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-sm font-medium" style={{ color: "var(--cream)" }}>{ex.name}</span>
                  {(ex.sets || ex.reps) && (
                    <span className="text-xs text-muted-foreground">
                      {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {(a.frequency || a.duration_weeks) && (
            <p className="text-xs text-muted-foreground">
              {[a.frequency, a.duration_weeks && `${a.duration_weeks} weeks`].filter(Boolean).join(" · ")}
            </p>
          )}
          {a.notes && (
            <p className="text-sm text-muted-foreground italic leading-relaxed">{a.notes}</p>
          )}
          <div className="flex gap-2 pt-1">
            {a.status === "active" && (
              <>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onStatusChange("completed")}>
                  <Check className="h-3.5 w-3.5 mr-1.5" /> Complete
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onStatusChange("paused")}>
                  Pause
                </Button>
              </>
            )}
            {(a.status === "paused" || a.status === "completed") && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onStatusChange("active")}>
                Reactivate
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
