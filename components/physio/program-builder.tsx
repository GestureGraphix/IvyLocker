"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  ChevronRight,
  Calendar,
  Loader2,
  Trash2,
  Copy,
  Search,
  X,
  Edit,
  Check,
  Pause,
  Play,
} from "lucide-react"
import { SessionEditor } from "./session-editor"
import type { SessionExercise } from "./session-editor"
import { ProgramComplianceView } from "./program-compliance-view"
import { toast } from "sonner"

interface PhysioAthlete {
  id: string
  name: string
  sport?: string
  team?: string
}

interface PhysioAssignment {
  id: string
  athlete_id: string
  athlete_name: string
  title: string
  type: "prehab" | "rehab"
  status: "active" | "completed" | "paused"
  frequency?: string
  duration_weeks?: number
  description?: string
  created_at: string
}

interface SessionData {
  id: string
  session_date: string
  title: string | null
  notes: string | null
  exercises: SessionExercise[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ProgramBuilderProps {
  athletes: PhysioAthlete[]
  assignments: PhysioAssignment[]
  onUpdate: () => void
}

export function ProgramBuilder({ athletes, assignments, onUpdate }: ProgramBuilderProps) {
  const [search, setSearch] = useState("")
  const [selectedAthlete, setSelectedAthlete] = useState<PhysioAthlete | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<PhysioAssignment | null>(null)
  const [showNewSession, setShowNewSession] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [showDuplicate, setShowDuplicate] = useState<string | null>(null)
  const [duplicateDate, setDuplicateDate] = useState("")
  const [duplicating, setDuplicating] = useState(false)
  // New program creation
  const [showNewProgram, setShowNewProgram] = useState(false)
  const [newProgramTitle, setNewProgramTitle] = useState("")
  const [newProgramType, setNewProgramType] = useState<"prehab" | "rehab">("prehab")
  const [newProgramFrequency, setNewProgramFrequency] = useState("")
  const [newProgramDuration, setNewProgramDuration] = useState("")
  const [newProgramDescription, setNewProgramDescription] = useState("")
  const [creatingProgram, setCreatingProgram] = useState(false)

  const showDropdown = search.length > 0 && !selectedAthlete
  const filtered = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.sport ?? "").toLowerCase().includes(search.toLowerCase())
  )

  // Fetch sessions for selected program
  const {
    data: sessionsData,
    mutate: mutateSessions,
  } = useSWR<{ sessions: SessionData[] }>(
    selectedProgram ? `/api/physio/programs/${selectedProgram.id}/sessions` : null,
    fetcher
  )
  const sessions = sessionsData?.sessions || []

  const athleteAssignments = selectedAthlete
    ? assignments.filter((a) => a.athlete_id === selectedAthlete.id)
    : []

  function selectAthlete(a: PhysioAthlete) {
    setSelectedAthlete(a)
    setSearch(a.name)
    setSelectedProgram(null)
    setShowNewSession(false)
    setEditingSessionId(null)
  }

  function clearAthlete() {
    setSelectedAthlete(null)
    setSearch("")
    setSelectedProgram(null)
    setShowNewSession(false)
    setEditingSessionId(null)
    setShowNewProgram(false)
  }

  async function handleCreateProgram() {
    if (!selectedAthlete || !newProgramTitle.trim()) {
      toast.error("Please enter a program title")
      return
    }
    setCreatingProgram(true)
    try {
      const res = await fetch("/api/physio/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          title: newProgramTitle.trim(),
          type: newProgramType,
          description: newProgramDescription.trim() || null,
          frequency: newProgramFrequency.trim() || null,
          duration_weeks: newProgramDuration ? parseInt(newProgramDuration) : null,
          exercises: [],
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create program")
      }
      toast.success("Program created!")
      setShowNewProgram(false)
      setNewProgramTitle("")
      setNewProgramType("prehab")
      setNewProgramFrequency("")
      setNewProgramDuration("")
      setNewProgramDescription("")
      onUpdate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create program")
    } finally {
      setCreatingProgram(false)
    }
  }

  function selectProgram(a: PhysioAssignment) {
    setSelectedProgram(a)
    setShowNewSession(false)
    setEditingSessionId(null)
  }

  async function handleStatusChange(assignmentId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/physio/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      toast.success(`Program ${newStatus}`)
      onUpdate()
    } catch {
      toast.error("Failed to update status")
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!selectedProgram || !confirm("Delete this session?")) return
    try {
      const res = await fetch(
        `/api/physio/programs/${selectedProgram.id}/sessions/${sessionId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Session deleted")
      mutateSessions()
    } catch {
      toast.error("Failed to delete session")
    }
  }

  async function handleDuplicate(sourceSessionId: string) {
    if (!selectedProgram || !duplicateDate) {
      toast.error("Select a target date")
      return
    }
    setDuplicating(true)
    try {
      const res = await fetch(
        `/api/physio/programs/${selectedProgram.id}/sessions/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_session_id: sourceSessionId,
            target_date: duplicateDate,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to duplicate")
      }
      toast.success(`Session duplicated to ${duplicateDate}`)
      setShowDuplicate(null)
      setDuplicateDate("")
      mutateSessions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate")
    } finally {
      setDuplicating(false)
    }
  }

  const toDateOnly = (s: string) => s ? s.slice(0, 10) : s

  const formatDate = (dateStr: string) => {
    const d = new Date(toDateOnly(dateStr) + "T12:00:00")
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  }

  return (
    <div className="space-y-4">
      {/* Athlete Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (selectedAthlete) clearAthlete() }}
            placeholder="Search athlete..."
            className="pl-9 bg-secondary/50"
          />
          {selectedAthlete && (
            <button
              onClick={clearAthlete}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => selectAthlete(a)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <span className="font-medium">{a.name}</span>
                {a.sport && (
                  <span className="ml-2 text-xs text-muted-foreground">{a.sport}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Programs List for Selected Athlete */}
      {selectedAthlete && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Programs for {selectedAthlete.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewProgram((v) => !v)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Program
            </Button>
          </div>

          {/* Create New Program Form */}
          {showNewProgram && (
            <div className="p-4 rounded-lg border border-primary/30 bg-card space-y-3">
              <div className="flex gap-2">
                {(["prehab", "rehab"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewProgramType(t)}
                    className="flex-1 py-1.5 rounded text-xs font-medium transition-colors border capitalize"
                    style={{
                      background: newProgramType === t
                        ? t === "rehab" ? "#f97316" : "#a78bfa"
                        : "transparent",
                      color: newProgramType === t ? "#fff" : "var(--muted-foreground)",
                      borderColor: newProgramType === t
                        ? t === "rehab" ? "#f97316" : "#a78bfa"
                        : "var(--border)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <Input
                value={newProgramTitle}
                onChange={(e) => setNewProgramTitle(e.target.value)}
                placeholder="Program title (e.g., Hip Stability Protocol)"
                className="h-8 text-sm bg-secondary/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newProgramFrequency}
                  onChange={(e) => setNewProgramFrequency(e.target.value)}
                  placeholder="Frequency (e.g., Daily)"
                  className="h-8 text-sm bg-secondary/50"
                />
                <Input
                  type="number"
                  value={newProgramDuration}
                  onChange={(e) => setNewProgramDuration(e.target.value)}
                  placeholder="Duration (weeks)"
                  className="h-8 text-sm bg-secondary/50"
                />
              </div>
              <textarea
                value={newProgramDescription}
                onChange={(e) => setNewProgramDescription(e.target.value)}
                placeholder="Description or notes (optional)..."
                rows={2}
                className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2 text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewProgram(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateProgram}
                  disabled={creatingProgram || !newProgramTitle.trim()}
                  className="ml-auto"
                  style={{
                    background: newProgramType === "rehab" ? "#f97316" : "#a78bfa",
                    color: "#fff",
                  }}
                >
                  {creatingProgram ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  Create Program
                </Button>
              </div>
            </div>
          )}

          {athleteAssignments.length === 0 && !showNewProgram && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No programs yet. Click "New Program" above to get started.
            </p>
          )}

          {athleteAssignments.map((a) => (
            <div key={a.id} className="space-y-0">
              <button
                onClick={() => selectProgram(a)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedProgram?.id === a.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30 bg-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        a.type === "rehab"
                          ? "text-orange-400 border-orange-400/30"
                          : "text-purple-400 border-purple-400/30"
                      }
                    >
                      {a.type}
                    </Badge>
                    <span className="font-medium text-sm">{a.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        a.status === "active"
                          ? "text-green-400 border-green-400/30"
                          : a.status === "paused"
                          ? "text-yellow-400 border-yellow-400/30"
                          : "text-muted-foreground"
                      }
                    >
                      {a.status}
                    </Badge>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        selectedProgram?.id === a.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>
                {a.frequency && (
                  <p className="text-xs text-muted-foreground mt-1">{a.frequency}</p>
                )}
              </button>

              {/* Expanded Program: Sessions */}
              {selectedProgram?.id === a.id && (
                <div className="ml-4 mt-2 space-y-3 border-l-2 border-primary/20 pl-4">
                  {/* Status actions */}
                  <div className="flex gap-2">
                    {a.status === "active" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(a.id, "paused")}>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(a.id, "completed")}>
                          <Check className="h-3 w-3 mr-1" /> Complete
                        </Button>
                      </>
                    )}
                    {a.status === "paused" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(a.id, "active")}>
                        <Play className="h-3 w-3 mr-1" /> Reactivate
                      </Button>
                    )}
                    {a.status === "completed" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(a.id, "active")}>
                        <Play className="h-3 w-3 mr-1" /> Reactivate
                      </Button>
                    )}
                  </div>

                  {/* Compliance View */}
                  <ProgramComplianceView programId={a.id} />

                  {/* Session List */}
                  {sessions.map((session) =>
                    editingSessionId === session.id ? (
                      <SessionEditor
                        key={session.id}
                        programId={a.id}
                        sessionId={session.id}
                        initialDate={session.session_date?.slice(0, 10)}
                        initialTitle={session.title || ""}
                        initialNotes={session.notes || ""}
                        initialExercises={Array.isArray(session.exercises) ? session.exercises : []}
                        onSave={() => {
                          setEditingSessionId(null)
                          mutateSessions()
                        }}
                        onCancel={() => setEditingSessionId(null)}
                        onDuplicate={(sid) => {
                          setShowDuplicate(sid)
                          setEditingSessionId(null)
                        }}
                      />
                    ) : (
                      <div
                        key={session.id}
                        className="p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {formatDate(session.session_date)}
                            </span>
                            {session.title && (
                              <span className="text-xs text-muted-foreground">
                                — {session.title}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingSessionId(session.id)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setShowDuplicate(session.id)
                                setDuplicateDate("")
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="p-1 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Exercise summary */}
                        <ul className="space-y-0.5 text-xs text-muted-foreground">
                          {(Array.isArray(session.exercises) ? session.exercises : []).map((ex, i) => (
                            <li key={i} className="flex gap-1">
                              <span className="text-muted-foreground/50">-</span>
                              <span>
                                {ex.name}
                                {ex.sets && ex.reps && (
                                  <span className="ml-1 text-foreground/60">
                                    {ex.sets}x{ex.reps}
                                    {ex.hold_seconds ? ` (${ex.hold_seconds}s hold)` : ""}
                                    {ex.side ? ` [${ex.side}]` : ""}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {/* Duplicate panel */}
                        {showDuplicate === session.id && (
                          <div className="mt-2 flex items-center gap-2 p-2 bg-secondary/30 rounded">
                            <span className="text-xs text-muted-foreground">Copy to:</span>
                            <Input
                              type="date"
                              value={duplicateDate}
                              onChange={(e) => setDuplicateDate(e.target.value)}
                              className="h-7 text-xs w-40 bg-secondary/50"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicate(session.id)}
                              disabled={!duplicateDate || duplicating}
                              className="h-7 text-xs"
                            >
                              {duplicating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Duplicate"
                              )}
                            </Button>
                            <button
                              onClick={() => setShowDuplicate(null)}
                              className="p-1 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Add New Session */}
                  {showNewSession ? (
                    <SessionEditor
                      programId={a.id}
                      initialDate={getNextDate(sessions)}
                      onSave={() => {
                        setShowNewSession(false)
                        mutateSessions()
                      }}
                      onCancel={() => setShowNewSession(false)}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewSession(true)}
                      className="w-full text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Session
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper: suggest the next day after the latest session
function getNextDate(sessions: SessionData[]): string {
  if (sessions.length === 0) {
    return new Date().toISOString().split("T")[0]
  }
  const latest = sessions[sessions.length - 1].session_date
  const dateOnly = latest ? latest.slice(0, 10) : new Date().toISOString().split("T")[0]
  const d = new Date(dateOnly + "T12:00:00")
  if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0]
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}
