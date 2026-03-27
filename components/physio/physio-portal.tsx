"use client"

import { useState } from "react"
import useSWR from "swr"
import { LogOut, X, Check, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

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

// ─── Constants & helpers ──────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

const C = {
  bg: "#f7f2ea",
  fg: "#1a1714",
  muted: "#a09080",
  rule: "#d5cec4",
  soft: "#ece5d8",
  red: "#b83232",
  gold: "#c9a84c",
  green: "#2d6a4f",
} as const

const MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }
const BEBAS: React.CSSProperties = { fontFamily: "'Bebas Neue', sans-serif" }

function athleteStatus(athleteId: string, assignments: PhysioAssignment[]): "flagged" | "protocol" | "cleared" {
  const active = assignments.filter((a) => a.athlete_id === athleteId && a.status === "active")
  if (active.some((a) => a.type === "rehab")) return "flagged"
  if (active.some((a) => a.type === "prehab")) return "protocol"
  return "cleared"
}

function statusColor(s: "flagged" | "protocol" | "cleared") {
  return s === "flagged" ? C.red : s === "protocol" ? C.gold : C.green
}

function statusLabel(s: "flagged" | "protocol" | "cleared") {
  return s === "flagged" ? "FLAGGED" : s === "protocol" ? "PROTOCOL" : "CLEARED"
}

function calcProgress(a: PhysioAssignment): number {
  if (!a.duration_weeks) return 0
  const total = a.duration_weeks * 7 * 24 * 60 * 60 * 1000
  return Math.min(1, Math.max(0, (Date.now() - new Date(a.created_at).getTime()) / total))
}

function fmtDate(d: Date, opts?: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric" })
}

// ─── Shared mini-components ───────────────────────────────────────────────────

function MonoLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ ...MONO, fontSize: "9px", letterSpacing: "2px", color: C.muted, ...style }}>
      {children}
    </p>
  )
}

function Rule({ style }: { style?: React.CSSProperties }) {
  return <div style={{ borderTop: `1px solid ${C.rule}`, ...style }} />
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function PhysioPortal() {
  const { logout } = useAuth()
  const [tab, setTab] = useState<"roster" | "calendar" | "assignments">("roster")
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

  const flagged = athletes.filter((a) => athleteStatus(a.id, assignments) === "flagged").length
  const protocols = assignments.filter((a) => a.status === "active").length
  const upcoming = meetings.filter((m) => m.status === "scheduled" && new Date(m.scheduled_at) >= new Date()).length

  const today = new Date()
  const dateStr = today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase().replace(",", " ·")

  const TABS = ["roster", "calendar", "assignments"] as const

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Top nav ── */}
      <header style={{
        display: "flex", alignItems: "stretch",
        borderBottom: `1px solid ${C.rule}`, height: "52px",
        paddingLeft: "28px", paddingRight: "28px",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: "32px", borderRight: `1px solid ${C.rule}`, gap: "2px", flexShrink: 0 }}>
          <span style={{ ...BEBAS, fontSize: "16px", letterSpacing: "3px", color: C.fg, lineHeight: 1 }}>LOCKER</span>
          <span style={{ ...MONO, fontSize: "8px", letterSpacing: "2px", color: C.muted, lineHeight: 1 }}>PHYSIO</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", flex: 1, paddingLeft: "8px" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...MONO, fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase",
                color: tab === t ? C.fg : C.muted,
                background: "none", border: "none",
                borderBottom: `2px solid ${tab === t ? C.fg : "transparent"}`,
                padding: "0 20px", cursor: "pointer", transition: "color 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Date + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
          <span style={{ ...MONO, fontSize: "10px", letterSpacing: "2px", color: C.muted }}>{dateStr}</span>
          <button onClick={logout} style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <LogOut size={13} />
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ flex: 1 }}>
        {tab === "roster" && (
          <RosterTab
            athletes={athletes}
            assignments={assignments}
            meetings={meetings}
            onUpdateAthletes={mutateAthletes}
            onUpdateMeetings={mutateMeetings}
            onUpdateAssignments={mutateAssignments}
            stats={{ athletes: athletes.length, flagged, protocols, upcoming }}
          />
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

function RosterTab({
  athletes, assignments, meetings,
  onUpdateAthletes, onUpdateMeetings, onUpdateAssignments,
  stats,
}: {
  athletes: PhysioAthlete[]
  assignments: PhysioAssignment[]
  meetings: PhysioMeeting[]
  onUpdateAthletes: () => void
  onUpdateMeetings: () => void
  onUpdateAssignments: () => void
  stats: { athletes: number; flagged: number; protocols: number; upcoming: number }
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState("")
  const [removing, setRemoving] = useState<string | null>(null)

  const selected = athletes.find((a) => a.id === selectedId) ?? null

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
      onUpdateAthletes()
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
      if (selectedId === id) setSelectedId(null)
      onUpdateAthletes()
    } finally {
      setRemoving(null)
    }
  }

  const statBlocks = [
    { label: "ATHLETES", value: stats.athletes, sub: "on roster", color: C.fg },
    { label: "FLAGGED",  value: stats.flagged,  sub: "needs review", color: C.red },
    { label: "PROTOCOLS",value: stats.protocols, sub: "active", color: C.gold },
    { label: "MEETINGS", value: stats.upcoming,  sub: "upcoming", color: C.green },
  ]

  return (
    <div style={{ display: "flex", height: "calc(100vh - 52px)" }}>

      {/* ── Left sidebar — stats ── */}
      <aside style={{ width: "190px", borderRight: `1px solid ${C.rule}`, flexShrink: 0, overflowY: "auto" }}>
        {statBlocks.map((s, i) => (
          <div key={s.label}>
            <div style={{ padding: "22px 24px" }}>
              <MonoLabel style={{ marginBottom: "6px" }}>{s.label}</MonoLabel>
              <p style={{ ...BEBAS, fontSize: "52px", lineHeight: 1, color: s.color, letterSpacing: "-1px" }}>{s.value}</p>
              <p style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>{s.sub}</p>
            </div>
            {i < statBlocks.length - 1 && <Rule />}
          </div>
        ))}
      </aside>

      {/* ── Center — roster list ── */}
      <div style={{ flex: 1, borderRight: `1px solid ${C.rule}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Add athlete */}
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.rule}`, flexShrink: 0 }}>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="email"
              placeholder="Add athlete by email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                flex: 1, background: "transparent", border: "none",
                borderBottom: `1px solid ${C.rule}`, borderRadius: 0,
                padding: "6px 0", fontSize: "13px", color: C.fg,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={adding}
              style={{
                ...MONO, fontSize: "9px", letterSpacing: "2px", color: C.muted,
                background: "none", border: `1px solid ${C.rule}`,
                padding: "6px 14px", cursor: "pointer", flexShrink: 0,
              }}
            >
              {adding ? "..." : "ADD"}
            </button>
          </form>
          {addError && <p style={{ fontSize: "11px", color: C.red, marginTop: "6px" }}>{addError}</p>}
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "3px 1fr 72px 110px 32px",
          padding: "8px 0",
          borderBottom: `1px solid ${C.rule}`,
          flexShrink: 0,
        }}>
          <div />
          <MonoLabel style={{ paddingLeft: "20px" }}>ATHLETE</MonoLabel>
          <MonoLabel style={{ textAlign: "center" }}>ACTIVE</MonoLabel>
          <MonoLabel>STATUS</MonoLabel>
          <div />
        </div>

        {/* Rows */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {athletes.length === 0 ? (
            <p style={{ padding: "48px 24px", color: C.muted, fontSize: "13px", textAlign: "center" }}>
              No athletes yet — add one by email above.
            </p>
          ) : (
            athletes.map((a) => {
              const s = athleteStatus(a.id, assignments)
              const sc = statusColor(s)
              const isSelected = selectedId === a.id
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(isSelected ? null : a.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3px 1fr 72px 110px 32px",
                    alignItems: "center",
                    borderBottom: `1px solid ${C.rule}`,
                    cursor: "pointer",
                    background: isSelected ? C.soft : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{ alignSelf: "stretch", background: sc }} />

                  <div style={{ padding: "13px 16px 13px 20px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 500, color: C.fg, lineHeight: 1.2 }}>{a.name}</p>
                    <p style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", color: C.muted, marginTop: "3px" }}>
                      {[a.sport, a.team].filter(Boolean).join(" · ").toUpperCase() || a.email}
                    </p>
                  </div>

                  <div style={{ textAlign: "center" }}>
                    <span style={{ ...BEBAS, fontSize: "24px", color: a.active_assignments > 0 ? sc : C.rule, lineHeight: 1 }}>
                      {a.active_assignments}
                    </span>
                  </div>

                  <div>
                    <span style={{
                      ...MONO, fontSize: "8px", letterSpacing: "1.5px",
                      color: sc, border: `1px solid ${sc}`,
                      padding: "3px 7px", display: "inline-block",
                    }}>
                      {statusLabel(s)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRemove(a.id)}
                      disabled={removing === a.id}
                      style={{ color: C.rule, background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                      title="Remove"
                    >
                      {removing === a.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right — athlete detail ── */}
      <aside style={{ width: "300px", flexShrink: 0, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {selected ? (
          <AthleteDetail
            athlete={selected}
            assignments={assignments.filter((a) => a.athlete_id === selected.id)}
            meetings={meetings.filter((m) => m.athlete_id === selected.id)}
            onUpdateMeetings={onUpdateMeetings}
          />
        ) : (
          <div style={{ padding: "48px 24px", color: C.muted, fontSize: "13px", textAlign: "center", lineHeight: 1.6 }}>
            Select an athlete<br />to view details
          </div>
        )}
      </aside>
    </div>
  )
}

// ─── Athlete Detail ───────────────────────────────────────────────────────────

function AthleteDetail({
  athlete, assignments, meetings, onUpdateMeetings,
}: {
  athlete: PhysioAthlete
  assignments: PhysioAssignment[]
  meetings: PhysioMeeting[]
  onUpdateMeetings: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [fTitle, setFTitle] = useState("")
  const [fDate, setFDate] = useState(() => new Date().toISOString().split("T")[0])
  const [fTime, setFTime] = useState("09:00")
  const [fDuration, setFDuration] = useState(60)
  const [fNotes, setFNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const s = (() => {
    if (assignments.some((a) => a.type === "rehab" && a.status === "active")) return "flagged" as const
    if (assignments.some((a) => a.type === "prehab" && a.status === "active")) return "protocol" as const
    return "cleared" as const
  })()

  const active = assignments.filter((a) => a.status === "active")
  const nextMeeting = meetings
    .filter((m) => m.status === "scheduled" && new Date(m.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault()
    setSaveError("")
    setSaving(true)
    try {
      const scheduledAt = new Date(`${fDate}T${fTime}`).toISOString()
      const res = await fetch("/api/physio/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.id, title: fTitle || "Meeting", notes: fNotes || null, scheduledAt, durationMinutes: fDuration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to schedule")
      setShowForm(false); setFTitle(""); setFNotes("")
      onUpdateMeetings()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <div style={{ padding: "24px 24px 18px", borderBottom: `1px solid ${C.rule}` }}>
        <h2 style={{ fontSize: "22px", fontWeight: 600, color: C.fg, lineHeight: 1.1, marginBottom: "6px" }}>
          {athlete.name}
        </h2>
        <MonoLabel>
          {[athlete.sport?.toUpperCase(), statusLabel(s)].filter(Boolean).join(" · ")}
        </MonoLabel>
      </div>

      {/* Protocols */}
      <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }}>
        {active.length === 0 ? (
          <p style={{ fontSize: "12px", color: C.muted }}>No active protocols.</p>
        ) : (
          active.map((a, i) => {
            const progress = calcProgress(a)
            const pct = Math.round(progress * 100)
            const started = fmtDate(new Date(a.created_at))
            const estEnd = a.duration_weeks
              ? fmtDate(new Date(new Date(a.created_at).getTime() + a.duration_weeks * 7 * 86400000))
              : null
            const typeColor = a.type === "rehab" ? C.red : C.gold

            return (
              <div key={a.id} style={{ marginBottom: i < active.length - 1 ? "28px" : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <MonoLabel style={{ marginBottom: "4px" }}>PROTOCOL · {a.type.toUpperCase()}</MonoLabel>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: C.fg }}>{a.title}</p>
                  </div>
                  <span style={{ ...MONO, fontSize: "11px", color: typeColor, flexShrink: 0, marginLeft: "8px" }}>{pct}%</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: "2px", background: C.rule, marginBottom: "12px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: typeColor, transition: "width 0.3s" }} />
                </div>

                {/* Dates */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <MonoLabel style={{ marginBottom: "3px" }}>STARTED</MonoLabel>
                    <p style={{ fontSize: "12px", color: C.fg }}>{started}</p>
                  </div>
                  {estEnd && (
                    <div>
                      <MonoLabel style={{ marginBottom: "3px" }}>EST. END</MonoLabel>
                      <p style={{ fontSize: "12px", color: C.fg }}>{estEnd}</p>
                    </div>
                  )}
                </div>

                {/* Exercises */}
                {a.exercises?.length > 0 && (
                  <div>
                    <MonoLabel style={{ marginBottom: "6px" }}>EXERCISES</MonoLabel>
                    {a.exercises.map((ex, ei) => (
                      <div key={ei} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.soft}` }}>
                        <p style={{ fontSize: "12px", color: C.fg }}>{ex.name}</p>
                        {(ex.sets || ex.reps) && (
                          <p style={{ ...MONO, fontSize: "11px", color: C.muted }}>
                            {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join(" ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {a.frequency && (
                  <p style={{ ...MONO, fontSize: "10px", color: C.muted, marginTop: "8px" }}>{a.frequency}</p>
                )}

                {i < active.length - 1 && <Rule style={{ marginTop: "20px" }} />}
              </div>
            )
          })
        )}

        {/* Next session */}
        {nextMeeting && (
          <div style={{ marginTop: "24px" }}>
            <Rule style={{ marginBottom: "16px" }} />
            <MonoLabel style={{ marginBottom: "6px" }}>NEXT SESSION</MonoLabel>
            <p style={{ fontSize: "13px", color: C.fg }}>{nextMeeting.title}</p>
            <p style={{ ...MONO, fontSize: "10px", color: C.green, marginTop: "3px" }}>
              {fmtDate(new Date(nextMeeting.scheduled_at))} · {new Date(nextMeeting.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>

      {/* Schedule meeting */}
      <div style={{ borderTop: `1px solid ${C.rule}` }}>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: "100%", padding: "18px 24px",
              ...MONO, fontSize: "10px", letterSpacing: "3px", color: C.muted,
              background: "none", border: "none", cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.fg }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.muted }}
          >
            SCHEDULE MEETING →
          </button>
        ) : (
          <form onSubmit={handleSchedule} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
              <MonoLabel>SCHEDULE MEETING</MonoLabel>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={13} />
              </button>
            </div>
            <input
              placeholder="Title"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "7px 10px", fontSize: "13px", color: C.fg, outline: "none", width: "100%" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required
                style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "7px 10px", fontSize: "12px", color: C.fg, outline: "none" }}
              />
              <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} required
                style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "7px 10px", fontSize: "12px", color: C.fg, outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[30, 45, 60, 90].map((d) => (
                <button
                  key={d} type="button" onClick={() => setFDuration(d)}
                  style={{
                    flex: 1, padding: "6px 0",
                    ...MONO, fontSize: "10px",
                    background: fDuration === d ? C.fg : "transparent",
                    color: fDuration === d ? C.bg : C.muted,
                    border: `1px solid ${fDuration === d ? C.fg : C.rule}`,
                    cursor: "pointer",
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>
            <textarea
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              rows={2}
              placeholder="Notes (optional)"
              style={{ width: "100%", border: `1px solid ${C.rule}`, background: "transparent", padding: "8px 10px", fontSize: "12px", resize: "none", color: C.fg, outline: "none" }}
            />
            {saveError && <p style={{ fontSize: "11px", color: C.red }}>{saveError}</p>}
            <button
              type="submit" disabled={saving}
              style={{
                width: "100%", padding: "10px",
                ...MONO, fontSize: "10px", letterSpacing: "2px",
                background: C.fg, color: C.bg, border: "none", cursor: "pointer",
              }}
            >
              {saving ? "..." : "CONFIRM →"}
            </button>
          </form>
        )}
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

  const cellStyle = (isToday: boolean, isSelected: boolean): React.CSSProperties => ({
    height: "52px",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
    paddingTop: "8px",
    borderBottom: `1px solid ${C.rule}`,
    borderRight: `1px solid ${C.rule}`,
    background: isSelected ? C.soft : "transparent",
    cursor: "pointer",
  })

  return (
    <div style={{ padding: "28px 28px", display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", alignItems: "start" }}>
      {/* Calendar */}
      <div style={{ border: `1px solid ${C.rule}`, overflow: "hidden" }}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.rule}` }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ ...BEBAS, fontSize: "18px", letterSpacing: "3px", color: C.fg }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${C.rule}` }}>
          {DAY_LABELS.map((d) => (
            <div key={d} style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", color: C.muted, textAlign: "center", padding: "8px 0" }}>{d}</div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} style={{ height: "52px", borderBottom: `1px solid ${C.rule}`, borderRight: `1px solid ${C.rule}` }} />
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const hasMeeting = meetingDaySet.has(dateStr)
            const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate()
            const isSelected = selectedDay === day
            return (
              <button
                key={day}
                onClick={() => { setSelectedDay(isSelected ? null : day); setFDate(dateStr) }}
                style={cellStyle(isToday, isSelected)}
              >
                <span style={{
                  height: "22px", width: "22px", display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "50%", fontSize: "12px",
                  background: isToday ? C.fg : "transparent",
                  color: isToday ? C.bg : isSelected ? C.fg : C.fg,
                  fontWeight: isToday || isSelected ? 600 : 400,
                }}>
                  {day}
                </span>
                {hasMeeting && <div style={{ height: "4px", width: "4px", borderRadius: "50%", background: C.green, marginTop: "3px" }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Form */}
        <div style={{ border: `1px solid ${C.rule}`, padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <MonoLabel>SCHEDULE MEETING</MonoLabel>
            {showForm && (
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                <X size={13} />
              </button>
            )}
          </div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{
                width: "100%", padding: "10px",
                ...MONO, fontSize: "10px", letterSpacing: "2px",
                background: C.fg, color: C.bg, border: "none", cursor: "pointer",
              }}
            >
              + NEW MEETING
            </button>
          ) : (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <select
                value={fAthleteId} onChange={(e) => setFAthleteId(e.target.value)} required
                style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "7px 10px", fontSize: "12px", color: C.fg, outline: "none" }}
              >
                <option value="">Select athlete...</option>
                {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <input
                placeholder="Title" value={fTitle} onChange={(e) => setFTitle(e.target.value)}
                style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "7px 10px", fontSize: "12px", color: C.fg, outline: "none" }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} required
                  style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "7px 10px", fontSize: "12px", color: C.fg, outline: "none" }}
                />
                <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} required
                  style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "7px 10px", fontSize: "12px", color: C.fg, outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {[30, 45, 60, 90].map((d) => (
                  <button
                    key={d} type="button" onClick={() => setFDuration(d)}
                    style={{
                      flex: 1, padding: "6px 0",
                      ...MONO, fontSize: "10px",
                      background: fDuration === d ? C.fg : "transparent",
                      color: fDuration === d ? C.bg : C.muted,
                      border: `1px solid ${fDuration === d ? C.fg : C.rule}`,
                      cursor: "pointer",
                    }}
                  >
                    {d}m
                  </button>
                ))}
              </div>
              <textarea
                value={fNotes} onChange={(e) => setFNotes(e.target.value)}
                rows={2} placeholder="Notes (optional)"
                style={{ width: "100%", border: `1px solid ${C.rule}`, background: "transparent", padding: "8px 10px", fontSize: "12px", resize: "none", color: C.fg, outline: "none" }}
              />
              {saveError && <p style={{ fontSize: "11px", color: C.red }}>{saveError}</p>}
              <button
                type="submit" disabled={saving}
                style={{
                  width: "100%", padding: "10px",
                  ...MONO, fontSize: "10px", letterSpacing: "2px",
                  background: C.fg, color: C.bg, border: "none", cursor: "pointer",
                }}
              >
                {saving ? "..." : "CONFIRM →"}
              </button>
            </form>
          )}
        </div>

        {/* Meeting list */}
        <div>
          <MonoLabel style={{ marginBottom: "10px" }}>
            {selectedDay ? `${MONTH_NAMES[month - 1].toUpperCase()} ${selectedDay}` : "UPCOMING"}
          </MonoLabel>
          {visibleMeetings.length === 0 ? (
            <p style={{ fontSize: "12px", color: C.muted }}>
              {selectedDay ? "No meetings this day." : "No upcoming meetings."}
            </p>
          ) : (
            <div style={{ border: `1px solid ${C.rule}` }}>
              {visibleMeetings.map((m, i) => {
                const dt = new Date(m.scheduled_at)
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: i < visibleMeetings.length - 1 ? `1px solid ${C.rule}` : "none",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", color: C.fg, fontWeight: 500, textDecoration: m.status === "completed" ? "line-through" : "none" }}>
                        {m.title}
                      </p>
                      <p style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", color: C.muted, marginTop: "3px" }}>
                        {m.athlete_name} · {fmtDate(dt)} · {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    {m.status === "scheduled" && (
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button
                          onClick={() => updateMeeting(m.id, "completed")}
                          style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}
                          title="Mark complete"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          onClick={() => updateMeeting(m.id, "cancelled")}
                          style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}
                    {m.status !== "scheduled" && (
                      <span style={{ ...MONO, fontSize: "8px", letterSpacing: "1px", color: C.muted }}>{m.status.toUpperCase()}</span>
                    )}
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

// ─── Assignments Tab ──────────────────────────────────────────────────────────

function AssignmentsTab({
  athletes, assignments, onUpdate,
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
    setFFrequency(""); setFDurationWeeks(""); setFNotes(""); setSaveError("")
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

  const inputStyle: React.CSSProperties = {
    background: "transparent", border: `1px solid ${C.rule}`,
    padding: "7px 10px", fontSize: "13px", color: C.fg, outline: "none", width: "100%",
  }

  return (
    <div style={{ padding: "28px" }}>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={filterAthlete} onChange={(e) => setFilterAthlete(e.target.value)}
            style={{ background: "transparent", border: `1px solid ${C.rule}`, padding: "6px 10px", fontSize: "12px", color: C.fg, outline: "none" }}
          >
            <option value="all">All athletes</option>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {(["all", "prehab", "rehab"] as const).map((t) => (
            <button
              key={t} onClick={() => setFilterType(t)}
              style={{
                ...MONO, fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase",
                padding: "6px 12px", cursor: "pointer",
                background: filterType === t ? C.fg : "transparent",
                color: filterType === t ? C.bg : C.muted,
                border: `1px solid ${filterType === t ? C.fg : C.rule}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) resetForm() }}
          style={{
            ...MONO, fontSize: "9px", letterSpacing: "2px",
            padding: "7px 16px", cursor: "pointer",
            background: showForm ? "transparent" : C.fg,
            color: showForm ? C.muted : C.bg,
            border: `1px solid ${showForm ? C.rule : C.fg}`,
          }}
        >
          {showForm ? "CANCEL" : "+ NEW"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ border: `1px solid ${C.rule}`, padding: "24px", marginBottom: "20px" }}>
          <MonoLabel style={{ marginBottom: "16px" }}>NEW ASSIGNMENT</MonoLabel>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <MonoLabel style={{ marginBottom: "6px" }}>ATHLETE</MonoLabel>
                <select value={fAthleteId} onChange={(e) => setFAthleteId(e.target.value)} required style={inputStyle}>
                  <option value="">Select...</option>
                  {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <MonoLabel style={{ marginBottom: "6px" }}>TYPE</MonoLabel>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["prehab", "rehab"] as const).map((t) => (
                    <button
                      key={t} type="button" onClick={() => setFType(t)}
                      style={{
                        flex: 1, padding: "8px 0",
                        ...MONO, fontSize: "10px", letterSpacing: "1px", textTransform: "uppercase",
                        background: fType === t ? (t === "rehab" ? C.red : C.gold) : "transparent",
                        color: fType === t ? "#fff" : C.muted,
                        border: `1px solid ${fType === t ? (t === "rehab" ? C.red : C.gold) : C.rule}`,
                        cursor: "pointer",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <MonoLabel style={{ marginBottom: "6px" }}>TITLE</MonoLabel>
              <input placeholder="e.g. Hip stability protocol" value={fTitle} onChange={(e) => setFTitle(e.target.value)} required style={inputStyle} />
            </div>

            <div>
              <MonoLabel style={{ marginBottom: "6px" }}>DESCRIPTION</MonoLabel>
              <textarea
                value={fDescription} onChange={(e) => setFDescription(e.target.value)}
                rows={2} placeholder="Overview..."
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <MonoLabel>EXERCISES</MonoLabel>
                <button type="button" onClick={addExRow} style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", color: C.green, background: "none", border: "none", cursor: "pointer" }}>
                  + ADD ROW
                </button>
              </div>
              {fExercises.map((ex, idx) => (
                <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                  <input placeholder="Exercise" value={ex.name} onChange={(e) => updateEx(idx, "name", e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input placeholder="Sets" value={ex.sets} onChange={(e) => updateEx(idx, "sets", e.target.value)}
                    style={{ ...inputStyle, width: "60px" }}
                  />
                  <input placeholder="Reps" value={ex.reps} onChange={(e) => updateEx(idx, "reps", e.target.value)}
                    style={{ ...inputStyle, width: "60px" }}
                  />
                  {fExercises.length > 1 && (
                    <button type="button" onClick={() => removeExRow(idx)} style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <MonoLabel style={{ marginBottom: "6px" }}>FREQUENCY</MonoLabel>
                <input placeholder="e.g. Daily, 3×/week" value={fFrequency} onChange={(e) => setFFrequency(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <MonoLabel style={{ marginBottom: "6px" }}>DURATION (WEEKS)</MonoLabel>
                <input type="number" min={1} max={52} placeholder="e.g. 6" value={fDurationWeeks} onChange={(e) => setFDurationWeeks(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div>
              <MonoLabel style={{ marginBottom: "6px" }}>CLINICAL NOTES</MonoLabel>
              <textarea
                value={fNotes} onChange={(e) => setFNotes(e.target.value)}
                rows={2} placeholder="Contraindications, progressions..."
                style={{ ...inputStyle, resize: "none" }}
              />
            </div>

            {saveError && <p style={{ fontSize: "11px", color: C.red }}>{saveError}</p>}

            <button
              type="submit" disabled={saving}
              style={{
                padding: "11px", ...MONO, fontSize: "10px", letterSpacing: "2px",
                background: fType === "rehab" ? C.red : C.gold,
                color: fType === "rehab" ? "#fff" : C.fg,
                border: "none", cursor: "pointer",
              }}
            >
              {saving ? "..." : "SAVE ASSIGNMENT →"}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <p style={{ color: C.muted, fontSize: "13px" }}>No assignments yet.</p>
      ) : (
        <div style={{ border: `1px solid ${C.rule}` }}>
          {filtered.map((a, i) => {
            const typeColor = a.type === "rehab" ? C.red : C.gold
            const expanded = expandedId === a.id
            return (
              <div key={a.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.rule}` : "none" }}>
                <button
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div style={{ width: "3px", alignSelf: "stretch", background: typeColor, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: C.fg }}>{a.title}</p>
                      <p style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", color: C.muted, marginTop: "3px" }}>
                        {a.athlete_name} · {a.type.toUpperCase()}{a.frequency ? ` · ${a.frequency}` : ""}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    {a.status !== "active" && (
                      <span style={{ ...MONO, fontSize: "8px", letterSpacing: "1px", color: C.muted }}>{a.status.toUpperCase()}</span>
                    )}
                    <span style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", color: typeColor }}>
                      {a.duration_weeks ? `${Math.round(calcProgress(a) * 100)}%` : ""}
                    </span>
                    <span style={{ color: C.muted, fontSize: "10px", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                  </div>
                </button>

                {expanded && (
                  <div style={{ padding: "0 20px 16px 35px", borderTop: `1px solid ${C.soft}` }}>
                    {a.description && (
                      <p style={{ fontSize: "12px", color: C.muted, lineHeight: 1.6, marginTop: "12px" }}>{a.description}</p>
                    )}
                    {a.exercises?.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <MonoLabel style={{ marginBottom: "8px" }}>EXERCISES</MonoLabel>
                        {a.exercises.map((ex, ei) => (
                          <div key={ei} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.soft}` }}>
                            <p style={{ fontSize: "12px", color: C.fg }}>{ex.name}</p>
                            {(ex.sets || ex.reps) && (
                              <p style={{ ...MONO, fontSize: "11px", color: C.muted }}>
                                {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join(" ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {a.notes && <p style={{ fontSize: "12px", color: C.muted, fontStyle: "italic", marginTop: "10px" }}>{a.notes}</p>}
                    <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                      {a.status === "active" && (
                        <>
                          <button onClick={() => updateStatus(a.id, "completed")}
                            style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", padding: "6px 14px", border: `1px solid ${C.rule}`, background: "transparent", color: C.green, cursor: "pointer" }}>
                            COMPLETE
                          </button>
                          <button onClick={() => updateStatus(a.id, "paused")}
                            style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", padding: "6px 14px", border: `1px solid ${C.rule}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                            PAUSE
                          </button>
                        </>
                      )}
                      {(a.status === "paused" || a.status === "completed") && (
                        <button onClick={() => updateStatus(a.id, "active")}
                          style={{ ...MONO, fontSize: "9px", letterSpacing: "1px", padding: "6px 14px", border: `1px solid ${C.rule}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                          REACTIVATE
                        </button>
                      )}
                      <button onClick={() => deleteAssignment(a.id)}
                        style={{ color: C.muted, background: "none", border: "none", cursor: "pointer", marginLeft: "auto", display: "flex", alignItems: "center" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
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
