"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Stethoscope, Users, Calendar, ClipboardList, LogOut,
  UserPlus, Trash2, Loader2, ChevronLeft, ChevronRight,
  Plus, X, Check, ChevronDown,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Input } from "@/components/ui/input"

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

function monoLabel(children: React.ReactNode) {
  return (
    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted)" }}>
      {children}
    </p>
  )
}

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

  const TABS = [
    { key: "roster" as const, label: "Roster", Icon: Users },
    { key: "calendar" as const, label: "Calendar", Icon: Calendar },
    { key: "assignments" as const, label: "Assignments", Icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)" }}
      >
        <div className="flex items-center gap-3">
          <Stethoscope className="h-5 w-5 flex-shrink-0" style={{ color: PURPLE }} />
          <div>
            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "24px",
                letterSpacing: "1px",
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              Physio Portal
            </h1>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginTop: "2px",
              }}
            >
              Athlete Management
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)" }}>
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 px-6 py-3 transition-all"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: tab === key ? PURPLE : "var(--muted)",
              borderBottom: `2px solid ${tab === key ? PURPLE : "transparent"}`,
              fontWeight: tab === key ? 600 : 400,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {tab === "roster" && (
          <RosterTab athletes={athletes} onUpdate={mutateAthletes} />
        )}
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

  const activeTotal = athletes.reduce((s, a) => s + a.active_assignments, 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Athletes", value: athletes.length, color: PURPLE },
          { label: "Active Assignments", value: activeTotal, color: ORANGE },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-lg p-4 text-center"
            style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
          >
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            {monoLabel(label)}
          </div>
        ))}
      </div>

      {/* Add athlete */}
      <div
        className="rounded-lg p-4"
        style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
      >
        {monoLabel("Add Athlete by Email")}
        <form onSubmit={handleAdd} className="flex gap-2 mt-2">
          <Input
            type="email"
            placeholder="athlete@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 rounded flex items-center gap-1.5 transition-all"
            style={{ background: PURPLE, color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: "10px" }}
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Add
          </button>
        </form>
        {addError && (
          <p className="mt-2 text-sm" style={{ color: "#b83232" }}>{addError}</p>
        )}
      </div>

      {/* Athlete list */}
      {athletes.length === 0 ? (
        <EmptyState>No athletes yet. Add one above by email.</EmptyState>
      ) : (
        <div className="space-y-2">
          {athletes.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                  style={{ background: PURPLE }}
                >
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--ink)" }}>{a.name}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
                    {[a.sport, a.team, a.university].filter(Boolean).join(" · ") || a.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                {a.active_assignments > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-white"
                    style={{ background: ORANGE, fontFamily: "'DM Mono', monospace", fontSize: "9px" }}
                  >
                    {a.active_assignments} active
                  </span>
                )}
                <button
                  onClick={() => handleRemove(a.id)}
                  disabled={removing === a.id}
                  className="opacity-30 hover:opacity-70 transition-opacity"
                >
                  {removing === a.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "#b83232" }} />
                    : <Trash2 className="h-3.5 w-3.5" style={{ color: "#b83232" }} />
                  }
                </button>
              </div>
            </div>
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

  // Form state
  const [fAthleteId, setFAthleteId] = useState("")
  const [fTitle, setFTitle] = useState("")
  const [fDate, setFDate] = useState(() => {
    const n = new Date()
    return n.toISOString().split("T")[0]
  })
  const [fTime, setFTime] = useState("09:00")
  const [fDuration, setFDuration] = useState(60)
  const [fNotes, setFNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  // Build calendar grid
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Group meeting days for dot display
  const meetingDaySet = new Set(
    meetings.map((m) => {
      const d = new Date(m.scheduled_at)
      return d.toLocaleDateString("en-CA") // YYYY-MM-DD local
    })
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
        body: JSON.stringify({
          athleteId: fAthleteId,
          title: fTitle || "Meeting",
          notes: fNotes || null,
          scheduledAt,
          durationMinutes: fDuration,
        }),
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

  async function deleteMeeting(id: string) {
    await fetch(`/api/physio/meetings/${id}`, { method: "DELETE" })
    onUpdate()
  }

  return (
    <div className="space-y-5">
      {/* Calendar card */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
      >
        {/* Month navigation */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)" }}
        >
          <button
            onClick={prevMonth}
            className="p-1.5 rounded transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream-d, #f7f4ef)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "18px",
              letterSpacing: "2px",
              color: "var(--ink)",
            }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream-d, #f7f4ef)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day-of-week header */}
        <div
          className="grid border-b"
          style={{ gridTemplateColumns: "repeat(7, 1fr)", borderColor: "var(--cream-dd, #e8e2d9)" }}
        >
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="py-2 text-center"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={`e-${i}`}
                  className="h-14 border-b border-r"
                  style={{ borderColor: "var(--cream-dd, #e8e2d9)" }}
                />
              )
            }
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const hasMeeting = meetingDaySet.has(dateStr)
            const isToday =
              year === today.getFullYear() &&
              month === today.getMonth() + 1 &&
              day === today.getDate()
            const isSelected = selectedDay === day

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDay(isSelected ? null : day)
                  if (!isSelected) {
                    setFDate(dateStr)
                  }
                }}
                className="h-14 flex flex-col items-center justify-start pt-1.5 border-b border-r transition-colors"
                style={{
                  borderColor: "var(--cream-dd, #e8e2d9)",
                  background: isSelected
                    ? `rgba(167,139,250,0.10)`
                    : isToday
                    ? `rgba(167,139,250,0.04)`
                    : "transparent",
                }}
              >
                <span
                  className="h-6 w-6 flex items-center justify-center rounded-full"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px",
                    fontWeight: isToday || isSelected ? 600 : 400,
                    background: isToday ? PURPLE : "transparent",
                    color: isToday ? "#fff" : isSelected ? PURPLE : "var(--ink)",
                  }}
                >
                  {day}
                </span>
                {hasMeeting && (
                  <div
                    className="h-1.5 w-1.5 rounded-full mt-0.5"
                    style={{ background: isSelected ? PURPLE : "rgba(167,139,250,0.5)" }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Schedule button + section label */}
      <div className="flex items-center justify-between">
        {monoLabel(
          selectedDay
            ? `${MONTH_NAMES[month - 1]} ${selectedDay}`
            : "Upcoming Meetings"
        )}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all"
          style={{
            background: showForm ? "var(--cream-d, #f7f4ef)" : PURPLE,
            color: showForm ? "var(--muted)" : "#fff",
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            border: showForm ? "1px solid var(--cream-dd, #e8e2d9)" : "none",
          }}
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? "Cancel" : "Schedule"}
        </button>
      </div>

      {/* Meeting form */}
      {showForm && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)", background: "var(--cream-d, #f7f4ef)" }}
          >
            {monoLabel("Schedule Meeting")}
          </div>
          <form onSubmit={handleSave} className="p-4 space-y-3">
            <div>
              <div className="mb-1">{monoLabel("Athlete")}</div>
              <select
                value={fAthleteId}
                onChange={(e) => setFAthleteId(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm"
                style={{ borderColor: "var(--cream-dd, #e8e2d9)", color: "var(--ink)", background: "#fff" }}
              >
                <option value="">Select athlete...</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1">{monoLabel("Title")}</div>
              <Input
                placeholder="e.g. Initial assessment"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1">{monoLabel("Date")}</div>
                <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required />
              </div>
              <div>
                <div className="mb-1">{monoLabel("Time")}</div>
                <Input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} required />
              </div>
            </div>
            <div>
              <div className="mb-1">{monoLabel("Duration")}</div>
              <div className="flex gap-2">
                {[30, 45, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setFDuration(d)}
                    className="flex-1 py-1.5 rounded transition-all"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      background: fDuration === d ? PURPLE : "var(--cream-d, #f7f4ef)",
                      color: fDuration === d ? "#fff" : "var(--muted)",
                      border: "1px solid var(--cream-dd, #e8e2d9)",
                    }}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1">{monoLabel("Notes")}</div>
              <textarea
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
                className="w-full rounded border px-3 py-2 text-sm resize-none"
                style={{ borderColor: "var(--cream-dd, #e8e2d9)", color: "var(--ink)" }}
              />
            </div>
            {saveError && <p className="text-sm" style={{ color: "#b83232" }}>{saveError}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded font-medium flex items-center justify-center gap-2 transition-all"
              style={{ background: PURPLE, color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "1px" }}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirm Meeting
            </button>
          </form>
        </div>
      )}

      {/* Meeting list */}
      {visibleMeetings.length === 0 ? (
        <EmptyState>
          {selectedDay ? "No meetings on this day." : "No upcoming meetings."} Click Schedule to add one.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {visibleMeetings.map((m) => {
            const dt = new Date(m.scheduled_at)
            const dateLabel = dt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            const timeLabel = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
            return (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{
                  border: "1px solid var(--cream-dd, #e8e2d9)",
                  background: m.status !== "scheduled" ? "var(--cream-d, #f7f4ef)" : "#fff",
                  opacity: m.status === "cancelled" ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-center flex-shrink-0" style={{ width: "36px" }}>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {dateLabel.split(" ")[0]}
                    </p>
                    <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px", color: "var(--ink)", lineHeight: 1 }}>
                      {dateLabel.split(" ")[1]}
                    </p>
                  </div>
                  <div className="w-px h-8 flex-shrink-0" style={{ background: "var(--cream-dd, #e8e2d9)" }} />
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{
                        color: "var(--ink)",
                        textDecoration: m.status === "completed" ? "line-through" : "none",
                      }}
                    >
                      {m.title}
                    </p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
                      {m.athlete_name} · {timeLabel} · {m.duration_minutes}m
                    </p>
                  </div>
                </div>
                {m.status === "scheduled" && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <button
                      onClick={() => updateMeeting(m.id, "completed")}
                      className="p-1.5 rounded"
                      style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}
                      title="Mark complete"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteMeeting(m.id)}
                      className="p-1.5 rounded opacity-30 hover:opacity-60 transition-opacity"
                      title="Delete"
                    >
                      <X className="h-3 w-3" style={{ color: "#b83232" }} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
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

  // Form state
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

  function addExRow() {
    setFExercises((r) => [...r, { name: "", sets: "", reps: "" }])
  }
  function removeExRow(i: number) {
    setFExercises((r) => r.filter((_, idx) => idx !== i))
  }
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
      const exercises = fExercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          name: ex.name.trim(),
          ...(ex.sets && { sets: ex.sets }),
          ...(ex.reps && { reps: ex.reps }),
        }))
      const res = await fetch("/api/physio/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: fAthleteId,
          title: fTitle,
          type: fType,
          description: fDescription || null,
          exercises,
          frequency: fFrequency || null,
          duration_weeks: fDurationWeeks ? parseInt(fDurationWeeks) : null,
          notes: fNotes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      setShowForm(false)
      resetForm()
      onUpdate()
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
    <div className="space-y-5">
      {/* Filters + new button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterAthlete}
            onChange={(e) => setFilterAthlete(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--cream-dd, #e8e2d9)", color: "var(--ink)", fontFamily: "'DM Mono', monospace", fontSize: "10px", background: "#fff" }}
          >
            <option value="all">All Athletes</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {(["all", "prehab", "rehab"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-3 py-1.5 rounded transition-all capitalize"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                background:
                  filterType === t
                    ? t === "rehab" ? ORANGE : t === "prehab" ? PURPLE : "var(--ink)"
                    : "var(--cream-d, #f7f4ef)",
                color: filterType === t ? "#fff" : "var(--muted)",
                border: "1px solid var(--cream-dd, #e8e2d9)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) resetForm() }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all"
          style={{
            background: showForm ? "var(--cream-d, #f7f4ef)" : PURPLE,
            color: showForm ? "var(--muted)" : "#fff",
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            border: showForm ? "1px solid var(--cream-dd, #e8e2d9)" : "none",
          }}
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? "Cancel" : "New Assignment"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)", background: "var(--cream-d, #f7f4ef)" }}
          >
            {monoLabel("New Assignment")}
          </div>
          <form onSubmit={handleSave} className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1">{monoLabel("Athlete")}</div>
                <select
                  value={fAthleteId}
                  onChange={(e) => setFAthleteId(e.target.value)}
                  required
                  className="w-full rounded border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--cream-dd, #e8e2d9)", color: "var(--ink)", background: "#fff" }}
                >
                  <option value="">Select...</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="mb-1">{monoLabel("Type")}</div>
                <div className="flex gap-2">
                  {(["prehab", "rehab"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFType(t)}
                      className="flex-1 py-2 rounded capitalize transition-all"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "10px",
                        background: fType === t ? (t === "prehab" ? PURPLE : ORANGE) : "var(--cream-d, #f7f4ef)",
                        color: fType === t ? "#fff" : "var(--muted)",
                        border: "1px solid var(--cream-dd, #e8e2d9)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1">{monoLabel("Title")}</div>
              <Input
                placeholder="e.g. Hip stability protocol"
                value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="mb-1">{monoLabel("Description")}</div>
              <textarea
                value={fDescription}
                onChange={(e) => setFDescription(e.target.value)}
                rows={2}
                placeholder="Overview of the protocol..."
                className="w-full rounded border px-3 py-2 text-sm resize-none"
                style={{ borderColor: "var(--cream-dd, #e8e2d9)", color: "var(--ink)" }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                {monoLabel("Exercises")}
                <button
                  type="button"
                  onClick={addExRow}
                  className="flex items-center gap-1 transition-opacity"
                  style={{ color: PURPLE, fontFamily: "'DM Mono', monospace", fontSize: "9px" }}
                >
                  <Plus className="h-3 w-3" /> Add row
                </button>
              </div>
              <div className="space-y-2">
                {fExercises.map((ex, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="Exercise name"
                      value={ex.name}
                      onChange={(e) => updateEx(idx, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Sets"
                      value={ex.sets}
                      onChange={(e) => updateEx(idx, "sets", e.target.value)}
                      style={{ width: "64px" }}
                    />
                    <Input
                      placeholder="Reps"
                      value={ex.reps}
                      onChange={(e) => updateEx(idx, "reps", e.target.value)}
                      style={{ width: "64px" }}
                    />
                    {fExercises.length > 1 && (
                      <button type="button" onClick={() => removeExRow(idx)} className="opacity-30 hover:opacity-60 flex-shrink-0">
                        <X className="h-3.5 w-3.5" style={{ color: "#b83232" }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1">{monoLabel("Frequency")}</div>
                <Input
                  placeholder="e.g. Daily, 3×/week"
                  value={fFrequency}
                  onChange={(e) => setFFrequency(e.target.value)}
                />
              </div>
              <div>
                <div className="mb-1">{monoLabel("Duration (weeks)")}</div>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  placeholder="e.g. 6"
                  value={fDurationWeeks}
                  onChange={(e) => setFDurationWeeks(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="mb-1">{monoLabel("Clinical Notes")}</div>
              <textarea
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                rows={2}
                placeholder="Contraindications, progressions, restrictions..."
                className="w-full rounded border px-3 py-2 text-sm resize-none"
                style={{ borderColor: "var(--cream-dd, #e8e2d9)", color: "var(--ink)" }}
              />
            </div>

            {saveError && <p className="text-sm" style={{ color: "#b83232" }}>{saveError}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded font-medium flex items-center justify-center gap-2"
              style={{ background: fType === "rehab" ? ORANGE : PURPLE, color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "1px" }}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Assignment
            </button>
          </form>
        </div>
      )}

      {/* Assignment list */}
      {filtered.length === 0 ? (
        <EmptyState>No assignments yet. Create one above.</EmptyState>
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
  const typeColor = a.type === "rehab" ? ORANGE : PURPLE

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        onClick={onToggle}
        style={{ background: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream-d, #f7f4ef)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-white"
            style={{
              background: typeColor,
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {a.type}
          </span>
          {a.status !== "active" && (
            <span
              className="flex-shrink-0 px-1.5 py-0.5 rounded"
              style={{
                background: a.status === "completed" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                color: a.status === "completed" ? "#16a34a" : "#854d0e",
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {a.status}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{a.title}</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)", marginTop: "1px" }}>
              {a.athlete_name}{a.frequency ? ` · ${a.frequency}` : ""}
            </p>
          </div>
        </div>
        <ChevronDown
          className="h-3.5 w-3.5 flex-shrink-0 ml-3 transition-transform"
          style={{ color: "var(--muted)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div
          className="border-t px-4 py-3 space-y-3"
          style={{ borderColor: "var(--cream-dd, #e8e2d9)", background: "var(--cream-d, #f7f4ef)" }}
        >
          {a.description && (
            <p style={{ fontSize: "13px", color: "var(--soft, #6b6058)", lineHeight: 1.6 }}>{a.description}</p>
          )}
          {a.exercises?.length > 0 && (
            <div className="space-y-1">
              {monoLabel("Exercises")}
              {a.exercises.map((ex, i) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>{ex.name}</span>
                  {(ex.sets || ex.reps) && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
                      {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {(a.frequency || a.duration_weeks) && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
              {[a.frequency, a.duration_weeks && `${a.duration_weeks} weeks`].filter(Boolean).join(" · ")}
            </p>
          )}
          {a.notes && (
            <p style={{ fontSize: "12px", color: "var(--soft, #6b6058)", fontStyle: "italic", lineHeight: 1.6 }}>{a.notes}</p>
          )}

          <div className="flex gap-2 pt-1">
            {a.status === "active" && (
              <>
                <ActionButton onClick={() => onStatusChange("completed")} color="green">Complete</ActionButton>
                <ActionButton onClick={() => onStatusChange("paused")} color="yellow">Pause</ActionButton>
              </>
            )}
            {(a.status === "paused" || a.status === "completed") && (
              <ActionButton onClick={() => onStatusChange("active")} color="purple">Reactivate</ActionButton>
            )}
            <button
              onClick={onDelete}
              className="py-1.5 px-3 rounded opacity-30 hover:opacity-60 transition-opacity"
              style={{ border: "1px solid var(--cream-dd, #e8e2d9)" }}
            >
              <Trash2 className="h-3 w-3" style={{ color: "#b83232" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({
  onClick,
  color,
  children,
}: {
  onClick: () => void
  color: "green" | "yellow" | "purple"
  children: React.ReactNode
}) {
  const styles = {
    green: { bg: "rgba(34,197,94,0.1)", color: "#16a34a", border: "rgba(34,197,94,0.2)" },
    yellow: { bg: "rgba(234,179,8,0.1)", color: "#854d0e", border: "rgba(234,179,8,0.2)" },
    purple: { bg: "rgba(167,139,250,0.1)", color: PURPLE, border: "rgba(167,139,250,0.2)" },
  }[color]

  return (
    <button
      onClick={onClick}
      className="flex-1 py-1.5 rounded transition-colors"
      style={{
        background: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        letterSpacing: "0.5px",
      }}
    >
      {children}
    </button>
  )
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-10 text-center"
      style={{ border: "1px dashed var(--cream-dd, #e8e2d9)" }}
    >
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--muted)", lineHeight: 1.8 }}>
        {children}
      </p>
    </div>
  )
}
