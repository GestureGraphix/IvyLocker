"use client"

import React, { useState } from "react"
import useSWR from "swr"
import {
  X, Check, Loader2, Trash2, ChevronLeft, ChevronRight, Plus,
  AlertTriangle, Users, CalendarDays, ClipboardList, LayoutDashboard, LogOut,
  Search, Save, Pause, Play, Link2, ExternalLink, Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

function getStatus(athleteId: string, assignments: PhysioAssignment[]): "flagged" | "protocol" | "cleared" {
  const active = assignments.filter((a) => a.athlete_id === athleteId && a.status === "active")
  if (active.some((a) => a.type === "rehab")) return "flagged"
  if (active.some((a) => a.type === "prehab")) return "protocol"
  return "cleared"
}

function calcProgress(a: PhysioAssignment): number {
  if (!a.duration_weeks) return 0
  const total = a.duration_weeks * 7 * 86400000
  return Math.min(1, Math.max(0, (Date.now() - new Date(a.created_at).getTime()) / total))
}

function fmtDate(d: Date, opts?: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric" })
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "calendar" | "athletes" | "plans"

const NAV_ITEMS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard",   Icon: LayoutDashboard },
  { key: "calendar",  label: "Calendar",    Icon: CalendarDays },
  { key: "athletes",  label: "Athletes",    Icon: Users },
  { key: "plans",     label: "Plans",       Icon: ClipboardList },
]

export function PhysioPortal({ userName }: { userName?: string }) {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>("dashboard")
  const [displayMonth, setDisplayMonth] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
  })

  const { data: ad, mutate: mutateAthletes } = useSWR<{ athletes: PhysioAthlete[] }>("/api/physio/athletes", fetcher)
  const { data: md, mutate: mutateMeetings } = useSWR<{ meetings: PhysioMeeting[] }>(`/api/physio/meetings?month=${displayMonth}`, fetcher)
  const { data: asd, mutate: mutateAssignments } = useSWR<{ assignments: PhysioAssignment[] }>("/api/physio/assignments", fetcher)

  const athletes = ad?.athletes ?? []
  const meetings = md?.meetings ?? []
  const assignments = asd?.assignments ?? []

  const flaggedCount = athletes.filter((a) => getStatus(a.id, assignments) === "flagged").length
  const activeProtocols = assignments.filter((a) => a.status === "active").length
  const upcomingMeetings = meetings.filter((m) => m.status === "scheduled" && new Date(m.scheduled_at) >= new Date()).length

  const displayName = userName || user?.name || "Physio"
  const nameParts = displayName.trim().split(" ")
  const surname = nameParts[nameParts.length - 1].toUpperCase()
  const firstName = nameParts[0]

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>

      {/* ── Sidebar ── */}
      <aside
        className="fixed left-0 top-0 z-40 h-screen flex flex-col overflow-hidden"
        style={{
          width: "200px",
          background: "var(--uni-primary)",
          backgroundImage: "repeating-linear-gradient(-55deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
        }}
      >
        {/* Wordmark */}
        <div className="px-[18px] py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="block leading-none" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px", letterSpacing: "4px", color: "#f7f2ea" }}>
            LOCKER
          </span>
          <span className="block mt-0.5" style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", textTransform: "uppercase", color: "#a78bfa" }}>
            Physio
          </span>
        </div>

        {/* Identity */}
        <div className="relative px-[18px] py-4 overflow-hidden flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span aria-hidden className="absolute right-2.5 top-2 select-none pointer-events-none leading-none"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "64px", color: "rgba(255,255,255,0.06)", letterSpacing: "-2px" }}>
            +
          </span>
          <p className="relative leading-tight" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "1.5px", color: "#f7f2ea" }}>
            {surname}
          </p>
          <p className="relative mt-0.5" style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
            {firstName}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
          <p className="px-[18px] pt-3 pb-1 uppercase" style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", color: "rgba(255,255,255,0.18)" }}>
            Portal
          </p>
          {NAV_ITEMS.map(({ key, label, Icon }) => {
            const isActive = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="w-full flex items-center gap-[9px] px-[18px] py-2 text-[12px] border-l-2 transition-all duration-[180ms]"
                style={{
                  color: isActive ? "#f7f2ea" : "rgba(255,255,255,0.38)",
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                  borderLeftColor: isActive ? "var(--uni-accent)" : "transparent",
                  fontWeight: isActive ? 500 : 400,
                  letterSpacing: "0.2px",
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.color = "rgba(255,255,255,0.70)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)" } }}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.color = "rgba(255,255,255,0.38)"; e.currentTarget.style.background = "transparent" } }}
              >
                <Icon style={{ width: "14px", height: "14px", opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-[11px]"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="pl-[200px] pb-8 w-full">
        <div className="p-6 md:p-7 space-y-5">

          {/* Page title */}
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", letterSpacing: "1px", color: "var(--ink)" }}>
              {NAV_ITEMS.find((n) => n.key === tab)?.label}
            </h1>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted-foreground)", marginTop: "2px" }}>
              Physio Portal · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
            <StatCell label="Athletes"  value={athletes.length}    sub="on roster"    />
            <StatCell label="Flagged"   value={flaggedCount}        sub="needs review" accent="#b83232" />
            <StatCell label="Protocols" value={activeProtocols}     sub="active"       accent="var(--ivy-mid)" />
            <StatCell label="Meetings"  value={upcomingMeetings}    sub="upcoming"     accent="var(--gold)" />
          </div>

          {/* Tab content */}
          {tab === "dashboard" && <DashboardTab athletes={athletes} assignments={assignments} meetings={meetings} />}
          {tab === "calendar"  && <CalendarTab athletes={athletes} meetings={meetings} displayMonth={displayMonth} onMonthChange={setDisplayMonth} onUpdate={mutateMeetings} />}
          {tab === "athletes"  && <AthletesTab athletes={athletes} assignments={assignments} onUpdate={mutateAthletes} />}
          {tab === "plans"     && <PlansTab athletes={athletes} assignments={assignments} onUpdate={mutateAssignments} />}
        </div>
      </main>
    </div>
  )
}

// ─── StatCell ─────────────────────────────────────────────────────────────────

function StatCell({ label, value, sub, accent }: { label: string; value: number; sub: string; accent?: string }) {
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

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({
  athletes, assignments, meetings,
}: {
  athletes: PhysioAthlete[]
  assignments: PhysioAssignment[]
  meetings: PhysioMeeting[]
}) {
  const { data: meData, mutate: mutateMe } = useSWR<{ user: { scheduling_link?: string } }>("/api/me", fetcher)
  const [linkValue, setLinkValue] = useState("")
  const [linkEditing, setLinkEditing] = useState(false)
  const [linkSaving, setLinkSaving] = useState(false)

  const currentLink = meData?.user?.scheduling_link || ""

  const startEditLink = () => {
    setLinkValue(currentLink)
    setLinkEditing(true)
  }

  const saveLink = async () => {
    setLinkSaving(true)
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduling_link: linkValue.trim() }),
      })
      if (!res.ok) throw new Error()
      toast.success("Scheduling link saved")
      setLinkEditing(false)
      mutateMe()
    } catch {
      toast.error("Failed to save link")
    } finally {
      setLinkSaving(false)
    }
  }

  const flagged = athletes.filter((a) => getStatus(a.id, assignments) === "flagged")
  const upcoming = meetings
    .filter((m) => m.status === "scheduled" && new Date(m.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-5 pt-1">

    {/* Scheduling link */}
    <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
      <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid var(--rule)" }}>
        <Link2 className="h-3.5 w-3.5" style={{ color: "var(--ivy-mid)" }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          Scheduling Link
        </span>
      </div>
      <div className="px-[18px] py-4">
        {linkEditing ? (
          <div className="flex gap-2">
            <input
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              placeholder="https://calendly.com/your-name"
              autoFocus
              className="flex-1 rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none"
              style={{ borderColor: "var(--rule)" }}
              onKeyDown={(e) => { if (e.key === "Enter") saveLink() }}
            />
            <Button size="sm" onClick={saveLink} disabled={linkSaving} style={{ background: "var(--ivy)", color: "#fff" }}>
              {linkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setLinkEditing(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : currentLink ? (
          <div className="flex items-center justify-between">
            <a
              href={currentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm flex items-center gap-1.5 hover:underline"
              style={{ color: "var(--ivy-mid)" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {currentLink.replace(/^https?:\/\//, "")}
            </a>
            <button
              onClick={startEditLink}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </div>
        ) : (
          <button
            onClick={startEditLink}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add your Calendly or scheduling link — athletes will see it on their Physio page
          </button>
        )}
      </div>
    </div>

    <div className="grid md:grid-cols-2 gap-5">
      {/* Flagged athletes */}
      <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
        <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid var(--rule)" }}>
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#b83232" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
            Flagged Athletes
          </span>
        </div>
        {flagged.length === 0 ? (
          <p className="px-[18px] py-6 text-sm text-muted-foreground">No athletes currently flagged.</p>
        ) : (
          <div>
            {flagged.map((a, i) => {
              const rehabAssignments = assignments.filter((x) => x.athlete_id === a.id && x.type === "rehab" && x.status === "active")
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-[18px] py-3"
                  style={{ borderBottom: i < flagged.length - 1 ? "1px solid var(--rule)" : "none" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{a.name}</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                      {[a.sport, a.team].filter(Boolean).join(" · ").toUpperCase() || a.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {rehabAssignments.slice(0, 1).map((x) => (
                      <span key={x.id} className="text-xs" style={{ color: "#b83232" }}>{x.title}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upcoming meetings */}
      <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
        <div className="flex items-center gap-2 px-[18px] py-3" style={{ borderBottom: "1px solid var(--rule)" }}>
          <CalendarDays className="h-3.5 w-3.5" style={{ color: "var(--ivy-mid)" }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
            Upcoming Meetings
          </span>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-[18px] py-6 text-sm text-muted-foreground">No upcoming meetings scheduled.</p>
        ) : (
          <div>
            {upcoming.map((m, i) => {
              const dt = new Date(m.scheduled_at)
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-[18px] py-3"
                  style={{ borderBottom: i < upcoming.length - 1 ? "1px solid var(--rule)" : "none" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{m.title}</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                      {m.athlete_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium" style={{ color: "var(--ivy-mid)" }}>
                      {fmtDate(dt)}
                    </p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted-foreground)", marginTop: "1px" }}>
                      {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {m.duration_minutes}m
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

function CalendarTab({
  athletes, meetings, displayMonth, onMonthChange, onUpdate,
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

  const meetingDaySet = new Set(meetings.map((m) => new Date(m.scheduled_at).toLocaleDateString("en-CA")))

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
    : meetings.filter((m) => m.status === "scheduled" && new Date(m.scheduled_at) >= today).slice(0, 8)

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
      setShowForm(false); setFTitle(""); setFNotes(""); setFAthleteId("")
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
    <div className="grid md:grid-cols-[1fr_320px] gap-5 pt-1">
      {/* Calendar grid */}
      <div>
        <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--rule)" }}>
            <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "2px", color: "var(--ink)" }}>
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button onClick={nextMonth} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--rule)" }}>
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center" style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", color: "var(--muted-foreground)" }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} className="h-12" style={{ borderBottom: "1px solid var(--rule)", borderRight: "1px solid var(--rule)" }} />
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const hasMeeting = meetingDaySet.has(dateStr)
              const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate()
              const isSelected = selectedDay === day
              return (
                <button
                  key={day}
                  onClick={() => { setSelectedDay(isSelected ? null : day); setFDate(dateStr) }}
                  className="h-12 flex flex-col items-center justify-start pt-2 transition-colors"
                  style={{
                    borderBottom: "1px solid var(--rule)", borderRight: "1px solid var(--rule)",
                    background: isSelected ? "var(--ivy-pale)" : "transparent",
                  }}
                >
                  <span
                    className="h-6 w-6 flex items-center justify-center rounded-full text-xs"
                    style={{
                      background: isToday ? "var(--ivy)" : "transparent",
                      color: isToday ? "#fff" : isSelected ? "var(--ivy)" : "var(--ink)",
                      fontWeight: isToday || isSelected ? 600 : 400,
                    }}
                  >
                    {day}
                  </span>
                  {hasMeeting && <div className="h-1 w-1 rounded-full mt-0.5" style={{ background: "var(--ivy-mid)" }} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Meeting list */}
        <div className="mt-4">
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "10px" }}>
            {selectedDay ? `${MONTH_NAMES[month - 1]} ${selectedDay}` : "Upcoming"}
          </p>
          {visibleMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{selectedDay ? "No meetings this day." : "No upcoming meetings."}</p>
          ) : (
            <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
              {visibleMeetings.map((m, i) => {
                const dt = new Date(m.scheduled_at)
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: i < visibleMeetings.length - 1 ? "1px solid var(--rule)" : "none" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--ink)", textDecoration: m.status === "completed" ? "line-through" : "none" }}>
                        {m.title}
                      </p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                        {m.athlete_name} · {fmtDate(dt)} · {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    {m.status === "scheduled" ? (
                      <div className="flex gap-1 ml-3 flex-shrink-0">
                        <button onClick={() => updateMeeting(m.id, "completed")} className="p-1.5 text-muted-foreground hover:text-green-600 transition-colors" title="Mark complete">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => updateMeeting(m.id, "cancelled")} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Cancel">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px", color: "var(--muted-foreground)", marginLeft: "12px" }} className="flex-shrink-0">
                        {m.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Schedule form */}
      <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--rule)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
            Schedule Meeting
          </span>
          {showForm && (
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="p-4">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full" style={{ background: "var(--ivy)", color: "#fff" }}>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          ) : (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Athlete</label>
                <select
                  value={fAthleteId} onChange={(e) => setFAthleteId(e.target.value)} required
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <option value="">Select athlete...</option>
                  {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Title</label>
                <input
                  placeholder="e.g. Initial assessment"
                  value={fTitle} onChange={(e) => setFTitle(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none"
                  style={{ borderColor: "var(--rule)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Date</label>
                  <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none"
                    style={{ borderColor: "var(--rule)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Time</label>
                  <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} required
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none"
                    style={{ borderColor: "var(--rule)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Duration</label>
                <div className="flex gap-1.5">
                  {[30, 45, 60, 90].map((d) => (
                    <button
                      key={d} type="button" onClick={() => setFDuration(d)}
                      className="flex-1 py-1.5 rounded text-xs transition-colors border"
                      style={{
                        background: fDuration === d ? "var(--ivy)" : "transparent",
                        color: fDuration === d ? "#fff" : "var(--muted-foreground)",
                        borderColor: fDuration === d ? "var(--ivy)" : "var(--rule)",
                      }}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={fNotes} onChange={(e) => setFNotes(e.target.value)}
                  rows={2} placeholder="Optional..."
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground resize-none outline-none"
                  style={{ borderColor: "var(--rule)" }}
                />
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
              <Button type="submit" disabled={saving} className="w-full" style={{ background: "var(--ivy)", color: "#fff" }}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Meeting
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Athletes Tab ─────────────────────────────────────────────────────────────

function AthletesTab({
  athletes, assignments, onUpdate,
}: {
  athletes: PhysioAthlete[]
  assignments: PhysioAssignment[]
  onUpdate: () => void
}) {
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

  const statusColors = {
    flagged:  { bg: "rgba(184,50,50,0.08)",  text: "#b83232" },
    protocol: { bg: "rgba(45,106,79,0.08)",  text: "var(--ivy-mid)" },
    cleared:  { bg: "rgba(45,106,79,0.08)",  text: "var(--ivy-mid)" },
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Add athlete */}
      <div className="bg-white p-4" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--ink)" }}>Add Athlete</p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="email"
            placeholder="athlete@university.edu"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none"
            style={{ borderColor: "var(--rule)" }}
          />
          <Button type="submit" disabled={adding} style={{ background: "var(--ivy)", color: "#fff" }}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {!adding && "Add"}
          </Button>
        </form>
        {addError && <p className="mt-2 text-sm text-destructive">{addError}</p>}
      </div>

      {/* Roster */}
      {athletes.length === 0 ? (
        <div className="bg-white py-12 text-center" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No athletes on roster yet.</p>
        </div>
      ) : (
        <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
          {/* Header row */}
          <div
            className="grid px-4 py-2"
            style={{ gridTemplateColumns: "1fr 100px 100px 36px", borderBottom: "1px solid var(--rule)" }}
          >
            {["Athlete", "Status", "Protocols", ""].map((h) => (
              <p key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                {h}
              </p>
            ))}
          </div>

          {athletes.map((a, i) => {
            const s = getStatus(a.id, assignments)
            const sc = statusColors[s]
            return (
              <div
                key={a.id}
                className="grid items-center px-4 py-3"
                style={{
                  gridTemplateColumns: "1fr 100px 100px 36px",
                  borderBottom: i < athletes.length - 1 ? "1px solid var(--rule)" : "none",
                }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{a.name}</p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", color: "var(--muted-foreground)", marginTop: "2px" }}>
                    {[a.sport, a.team].filter(Boolean).join(" · ").toUpperCase() || a.email}
                  </p>
                </div>

                <div>
                  <span
                    className="text-xs px-2 py-0.5 rounded capitalize"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {s}
                  </span>
                </div>

                <p className="text-sm" style={{ color: a.active_assignments > 0 ? "var(--ink)" : "var(--muted-foreground)" }}>
                  {a.active_assignments > 0 ? `${a.active_assignments} active` : "—"}
                </p>

                <button
                  onClick={() => handleRemove(a.id)}
                  disabled={removing === a.id}
                  className="text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                  title="Remove"
                >
                  {removing === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

function PlansTab({
  athletes, assignments, onUpdate,
}: {
  athletes: PhysioAthlete[]
  assignments: PhysioAssignment[]
  onUpdate: () => void
}) {
  const [search, setSearch] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<PhysioAthlete | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState<"prehab" | "rehab">("prehab")
  const [newTitle, setNewTitle] = useState("")
  const [newText, setNewText] = useState("")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editType, setEditType] = useState<"prehab" | "rehab">("prehab")
  const [editFrequency, setEditFrequency] = useState("")
  const [editText, setEditText] = useState("")
  const [saving, setSaving] = useState(false)

  const showDropdown = search.length > 0 && !selectedAthlete
  const filtered = athletes.filter(
    (a) => a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.sport ?? "").toLowerCase().includes(search.toLowerCase())
  )

  const athleteAssignments = selectedAthlete
    ? assignments.filter((a) => a.athlete_id === selectedAthlete.id)
    : []

  function selectAthlete(a: PhysioAthlete) {
    setSelectedAthlete(a)
    setSearch(a.name)
    setShowNew(false)
    setEditingId(null)
  }

  function clearAthlete() {
    setSelectedAthlete(null)
    setSearch("")
    setShowNew(false)
    setEditingId(null)
  }

  async function handleCreate() {
    if (!selectedAthlete || !newTitle.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/physio/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          title: newTitle.trim(),
          type: newType,
          description: newText.trim() || null,
          exercises: [],
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Plan created")
      setShowNew(false)
      setNewTitle("")
      setNewText("")
      onUpdate()
    } catch {
      toast.error("Failed to create plan")
    } finally {
      setCreating(false)
    }
  }

  function startEdit(a: PhysioAssignment) {
    setEditingId(a.id)
    setEditTitle(a.title)
    setEditType(a.type)
    setEditFrequency(a.frequency || "")
    setEditText(a.description || "")
  }

  async function handleSaveEdit(id: string) {
    if (!editTitle.trim()) { toast.error("Title is required"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/physio/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), type: editType, frequency: editFrequency.trim() || null, description: editText }),
      })
      if (!res.ok) throw new Error()
      toast.success("Plan updated")
      setEditingId(null)
      onUpdate()
    } catch {
      toast.error("Failed to update plan")
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(id: string, status: string) {
    await fetch(`/api/physio/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    onUpdate()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this plan?")) return
    await fetch(`/api/physio/assignments/${id}`, { method: "DELETE" })
    onUpdate()
  }

  const typeColor = (t: string) => t === "rehab" ? "#f97316" : "#a78bfa"

  return (
    <div className="space-y-5 pt-1">
      {/* Athlete search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search athletes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (selectedAthlete) clearAthlete() }}
            className="w-full rounded-md border px-3 py-2 pl-9 text-sm bg-background text-foreground outline-none"
            style={{ borderColor: "var(--rule)" }}
          />
          {selectedAthlete && (
            <button onClick={clearAthlete} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAthlete(a)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
              >
                <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{a.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", color: "var(--muted-foreground)" }}>
                  {[a.sport, a.team].filter(Boolean).join(" · ").toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected athlete plans */}
      {selectedAthlete && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Plans for {selectedAthlete.name}
            </span>
            <Button variant="outline" size="sm" onClick={() => setShowNew((v) => !v)} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> New Plan
            </Button>
          </div>

          {/* New plan form */}
          {showNew && (
            <div className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
              <div className="flex gap-0" style={{ borderBottom: "1px solid var(--rule)" }}>
                {(["prehab", "rehab"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className="flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors"
                    style={{
                      background: newType === t ? typeColor(t) : "transparent",
                      color: newType === t ? "#fff" : "var(--muted-foreground)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Plan title (e.g., Hip Stability Protocol)"
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none"
                  style={{ borderColor: "var(--rule)" }}
                />
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Type the full plan here — exercises, sets, reps, cues, notes..."
                  rows={8}
                  className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none resize-none"
                  style={{ borderColor: "var(--rule)", fontFamily: "'DM Mono', monospace", fontSize: "12px", lineHeight: "1.8" }}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating || !newTitle.trim()}
                    style={{ background: typeColor(newType), color: "#fff" }}
                  >
                    {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                    Save Plan
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Existing plans */}
          {athleteAssignments.length === 0 && !showNew && (
            <div className="bg-white py-10 text-center" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
              <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No plans yet. Click "New Plan" to get started.</p>
            </div>
          )}

          {athleteAssignments.map((a) => (
            <div key={a.id} className="bg-white overflow-hidden" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
              {editingId === a.id ? (
                /* ── Full edit mode ── */
                <div className="p-4 space-y-3">
                  {/* Type toggle */}
                  <div className="flex gap-0 rounded-md overflow-hidden border" style={{ borderColor: "var(--rule)" }}>
                    {(["prehab", "rehab"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setEditType(t)}
                        className="flex-1 py-2 text-xs font-medium uppercase tracking-wider transition-colors"
                        style={{
                          background: editType === t ? typeColor(t) : "transparent",
                          color: editType === t ? "#fff" : "var(--muted-foreground)",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Title */}
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Plan title"
                    className="w-full rounded-md border px-3 py-2 text-sm font-semibold bg-background text-foreground outline-none"
                    style={{ borderColor: "var(--rule)" }}
                  />

                  {/* Frequency */}
                  <input
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    placeholder="Frequency (e.g., Daily, 3x per week)"
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none"
                    style={{ borderColor: "var(--rule)" }}
                  />

                  {/* Description */}
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={10}
                    placeholder="Type the full plan here..."
                    className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground outline-none resize-none"
                    style={{ borderColor: typeColor(editType), fontFamily: "'DM Mono', monospace", fontSize: "12px", lineHeight: "1.8" }}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(a.id)}
                      disabled={saving}
                      style={{ background: typeColor(editType), color: "#fff" }}
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--rule)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-6 rounded-full" style={{ background: typeColor(a.type) }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{a.title}</p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", color: "var(--muted-foreground)", marginTop: "1px" }}>
                          {a.type.toUpperCase()} {a.frequency ? `· ${a.frequency}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => startEdit(a)} className="p-1.5 text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {a.status === "active" ? (
                        <button onClick={() => handleStatus(a.id, "paused")} className="p-1.5 text-muted-foreground hover:text-foreground" title="Pause">
                          <Pause className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => handleStatus(a.id, "active")} className="p-1.5 text-muted-foreground hover:text-green-500" title="Activate">
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Plan text */}
                  <div
                    onClick={() => startEdit(a)}
                    className="p-4 cursor-text min-h-[80px] hover:bg-secondary/10 transition-colors"
                    style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", lineHeight: "1.8", color: a.description ? "var(--ink)" : "var(--muted-foreground)", whiteSpace: "pre-wrap" }}
                  >
                    {a.description || "Click to type your plan..."}
                  </div>
                </>
              )}

              {/* Athlete notes */}
              <AthleteNotes assignmentId={a.id} />

              {a.status !== "active" && (
                <div className="px-4 pb-3">
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{a.status}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!selectedAthlete && assignments.length === 0 && (
        <div className="bg-white py-12 text-center" style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}>
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Search for an athlete above to write a plan.</p>
        </div>
      )}
    </div>
  )
}

// Shows athlete session notes for a plan on the physio side
function AthleteNotes({ assignmentId }: { assignmentId: string }) {
  const { data } = useSWR<{ logs: { id: string; logged_date: string; notes: string | null; pain_level: number | null; created_at: string; athlete_name: string }[] }>(
    `/api/physio/athlete-logs?assignmentId=${assignmentId}`,
    fetcher
  )
  const logs = data?.logs || []

  if (logs.length === 0) return null

  return (
    <div className="px-4 py-3" style={{ borderTop: "1px solid var(--rule)", background: "var(--cream-d, #f9f7f3)" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "8px" }}>
        Athlete Notes
      </p>
      <div className="space-y-2">
        {logs.slice(0, 10).map((log) => {
          const dateStr = (log.logged_date || log.created_at || "").slice(0, 10)
          const dateDisplay = dateStr ? new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""

          return (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-[11px] text-muted-foreground w-12 flex-shrink-0 pt-0.5">{dateDisplay}</span>
              <div className="flex-1 min-w-0">
                {log.notes ? (
                  <p style={{ fontSize: "12px", color: "var(--ink)", lineHeight: 1.5 }}>{log.notes}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Session completed</p>
                )}
              </div>
              {log.pain_level != null && log.pain_level > 0 && (
                <span
                  className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background: log.pain_level <= 3 ? "#dcfce7" : log.pain_level <= 6 ? "#fef9c3" : "#fee2e2",
                    color: log.pain_level <= 3 ? "#16a34a" : log.pain_level <= 6 ? "#ca8a04" : "#dc2626",
                  }}
                >
                  {log.pain_level}/10
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
