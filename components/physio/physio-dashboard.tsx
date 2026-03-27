"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, UserPlus, X, ChevronRight, Stethoscope, CheckCircle2, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Athlete {
  id: string
  name: string
  email: string
  sport?: string
  team?: string
  university?: string
  active_assignments: number
}

interface Exercise {
  name: string
  sets?: string
  reps?: string
  notes?: string
}

interface Assignment {
  id: string
  athlete_id: string
  athlete_name?: string
  title: string
  description?: string
  type: "prehab" | "rehab"
  exercises: Exercise[]
  frequency?: string
  duration_weeks?: number
  notes?: string
  status: "active" | "completed" | "paused"
  created_at: string
}

export function PhysioDashboard() {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadingAthletes, setLoadingAthletes] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [showAddAthlete, setShowAddAthlete] = useState(false)
  const [showAddAssignment, setShowAddAssignment] = useState(false)
  const [athleteEmail, setAthleteEmail] = useState("")
  const [addAthleteError, setAddAthleteError] = useState("")
  const [addingAthlete, setAddingAthlete] = useState(false)

  // Assignment form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "prehab" as "prehab" | "rehab",
    frequency: "",
    duration_weeks: "",
    notes: "",
    exercises: [{ name: "", sets: "", reps: "", notes: "" }] as Exercise[],
  })
  const [savingAssignment, setSavingAssignment] = useState(false)

  useEffect(() => {
    fetchAthletes()
  }, [])

  useEffect(() => {
    if (selectedAthlete) fetchAssignments(selectedAthlete.id)
  }, [selectedAthlete])

  async function fetchAthletes() {
    setLoadingAthletes(true)
    try {
      const res = await fetch("/api/physio/athletes")
      const data = await res.json()
      setAthletes(data.athletes || [])
    } finally {
      setLoadingAthletes(false)
    }
  }

  async function fetchAssignments(athleteId: string) {
    setLoadingAssignments(true)
    try {
      const res = await fetch(`/api/physio/assignments?athleteId=${athleteId}`)
      const data = await res.json()
      setAssignments(data.assignments || [])
    } finally {
      setLoadingAssignments(false)
    }
  }

  async function addAthlete() {
    if (!athleteEmail.trim()) return
    setAddingAthlete(true)
    setAddAthleteError("")
    try {
      const res = await fetch("/api/physio/athletes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: athleteEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setAddAthleteError(data.error || "Failed to add athlete"); return }
      setAthleteEmail("")
      setShowAddAthlete(false)
      fetchAthletes()
    } finally {
      setAddingAthlete(false)
    }
  }

  async function saveAssignment() {
    if (!selectedAthlete || !form.title.trim()) return
    setSavingAssignment(true)
    try {
      const exercises = form.exercises.filter(e => e.name.trim())
      const res = await fetch("/api/physio/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selectedAthlete.id,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          frequency: form.frequency.trim() || undefined,
          duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : undefined,
          notes: form.notes.trim() || undefined,
          exercises,
        }),
      })
      if (res.ok) {
        setForm({ title: "", description: "", type: "prehab", frequency: "", duration_weeks: "", notes: "", exercises: [{ name: "", sets: "", reps: "", notes: "" }] })
        setShowAddAssignment(false)
        fetchAssignments(selectedAthlete.id)
        fetchAthletes()
      }
    } finally {
      setSavingAssignment(false)
    }
  }

  async function markCompleted(assignmentId: string) {
    await fetch(`/api/physio/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    })
    if (selectedAthlete) fetchAssignments(selectedAthlete.id)
  }

  async function deleteAssignment(assignmentId: string) {
    await fetch(`/api/physio/assignments/${assignmentId}`, { method: "DELETE" })
    if (selectedAthlete) fetchAssignments(selectedAthlete.id)
  }

  function addExerciseRow() {
    setForm(f => ({ ...f, exercises: [...f.exercises, { name: "", sets: "", reps: "", notes: "" }] }))
  }

  function updateExercise(i: number, field: keyof Exercise, value: string) {
    setForm(f => {
      const exercises = [...f.exercises]
      exercises[i] = { ...exercises[i], [field]: value }
      return { ...f, exercises }
    })
  }

  function removeExercise(i: number) {
    setForm(f => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }))
  }

  const activeAssignments = assignments.filter(a => a.status === "active")
  const completedAssignments = assignments.filter(a => a.status === "completed")

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)" }}
      >
        <div className="flex items-center gap-3">
          <Stethoscope className="h-5 w-5" style={{ color: "#a78bfa" }} />
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
              Prehab &amp; Rehab Assignments
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddAthlete(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors"
          style={{
            background: "#a78bfa",
            color: "#fff",
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.5px",
          }}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add Athlete
        </button>
      </div>

      <div className="flex" style={{ minHeight: "calc(100vh - 73px)" }}>
        {/* Athlete list */}
        <div
          className="flex-shrink-0 overflow-y-auto"
          style={{
            width: "260px",
            borderRight: "1px solid var(--cream-dd, #e8e2d9)",
          }}
        >
          <div className="p-3">
            <p
              className="px-2 pt-2 pb-1 uppercase"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", color: "var(--muted)" }}
            >
              Athletes ({athletes.length})
            </p>

            {loadingAthletes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--muted)" }} />
              </div>
            ) : athletes.length === 0 ? (
              <div className="py-6 text-center px-4">
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--muted)", lineHeight: 1.6 }}>
                  No athletes yet. Add an athlete by email to get started.
                </p>
              </div>
            ) : (
              athletes.map(athlete => {
                const isSelected = selectedAthlete?.id === athlete.id
                return (
                  <button
                    key={athlete.id}
                    onClick={() => setSelectedAthlete(athlete)}
                    className="w-full text-left px-3 py-2.5 rounded mb-0.5 transition-all flex items-center justify-between"
                    style={{
                      background: isSelected ? "rgba(167,139,250,0.10)" : "transparent",
                      borderLeft: isSelected ? "2px solid #a78bfa" : "2px solid transparent",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>{athlete.name}</p>
                      {athlete.sport && (
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)", letterSpacing: "0.5px", marginTop: "1px" }}>
                          {athlete.sport}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {athlete.active_assignments > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded text-white"
                          style={{ background: "#a78bfa", fontFamily: "'DM Mono', monospace", fontSize: "9px" }}
                        >
                          {athlete.active_assignments}
                        </span>
                      )}
                      <ChevronRight className="h-3 w-3" style={{ color: "var(--muted)", opacity: 0.5 }} />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Assignment panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedAthlete ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Stethoscope className="h-8 w-8 mb-3" style={{ color: "rgba(167,139,250,0.3)" }} />
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--muted)", letterSpacing: "0.5px" }}>
                Select an athlete to view or manage their assignments
              </p>
            </div>
          ) : (
            <>
              {/* Athlete header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "20px",
                      letterSpacing: "1px",
                      color: "var(--ink)",
                      lineHeight: 1,
                    }}
                  >
                    {selectedAthlete.name}
                  </h2>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)", letterSpacing: "0.5px", marginTop: "2px" }}>
                    {[selectedAthlete.sport, selectedAthlete.team, selectedAthlete.university].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Button
                  onClick={() => setShowAddAssignment(true)}
                  size="sm"
                  className="flex items-center gap-1.5"
                  style={{ background: "#a78bfa", color: "#fff" }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Assignment
                </Button>
              </div>

              {loadingAssignments ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} />
                </div>
              ) : assignments.length === 0 ? (
                <div
                  className="rounded p-6 text-center"
                  style={{ border: "1px dashed var(--cream-dd, #e8e2d9)" }}
                >
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--muted)", lineHeight: 1.8 }}>
                    No assignments yet for {selectedAthlete.name}.<br />
                    Create a prehab or rehab protocol to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAssignments.length > 0 && (
                    <div>
                      <p
                        className="uppercase mb-2"
                        style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", color: "var(--muted)" }}
                      >
                        Active ({activeAssignments.length})
                      </p>
                      <div className="space-y-2">
                        {activeAssignments.map(a => (
                          <AssignmentCard
                            key={a.id}
                            assignment={a}
                            onComplete={() => markCompleted(a.id)}
                            onDelete={() => deleteAssignment(a.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {completedAssignments.length > 0 && (
                    <div>
                      <p
                        className="uppercase mb-2 mt-4"
                        style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", color: "var(--muted)" }}
                      >
                        Completed ({completedAssignments.length})
                      </p>
                      <div className="space-y-2 opacity-60">
                        {completedAssignments.map(a => (
                          <AssignmentCard
                            key={a.id}
                            assignment={a}
                            onComplete={() => {}}
                            onDelete={() => deleteAssignment(a.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Athlete Dialog */}
      {showAddAthlete && (
        <Dialog title="Add Athlete" onClose={() => { setShowAddAthlete(false); setAthleteEmail(""); setAddAthleteError("") }}>
          <div className="space-y-3">
            {addAthleteError && (
              <p className="text-sm" style={{ color: "#b83232" }}>{addAthleteError}</p>
            )}
            <div className="space-y-1.5">
              <Label>Athlete Email</Label>
              <Input
                type="email"
                placeholder="athlete@university.edu"
                value={athleteEmail}
                onChange={e => setAthleteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addAthlete()}
                autoFocus
              />
            </div>
            <Button onClick={addAthlete} disabled={addingAthlete || !athleteEmail.trim()} className="w-full" style={{ background: "#a78bfa", color: "#fff" }}>
              {addingAthlete ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Athlete"}
            </Button>
          </div>
        </Dialog>
      )}

      {/* Add Assignment Dialog */}
      {showAddAssignment && selectedAthlete && (
        <Dialog
          title={`New Assignment — ${selectedAthlete.name}`}
          onClose={() => setShowAddAssignment(false)}
          wide
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Type toggle */}
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["prehab", "rehab"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className="flex-1 py-2 text-sm font-medium rounded capitalize transition-all"
                    style={{
                      background: form.type === t ? "#a78bfa" : "var(--cream-d, #f0ece4)",
                      color: form.type === t ? "#fff" : "var(--soft)",
                      border: `1px solid ${form.type === t ? "#a78bfa" : "var(--cream-dd, #e8e2d9)"}`,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder={form.type === "prehab" ? "e.g. Hip stability protocol" : "e.g. ACL recovery phase 2"}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief overview of the program goals..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Input
                  placeholder="e.g. Daily, 3x/week"
                  value={form.frequency}
                  onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (weeks)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="4"
                  value={form.duration_weeks}
                  onChange={e => setForm(f => ({ ...f, duration_weeks: e.target.value }))}
                />
              </div>
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Exercises</Label>
                <button
                  type="button"
                  onClick={addExerciseRow}
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: "#a78bfa", fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "0.5px" }}
                >
                  <Plus className="h-3 w-3" /> Add exercise
                </button>
              </div>
              <div className="space-y-2">
                {form.exercises.map((ex, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <Input
                      placeholder="Exercise name"
                      value={ex.name}
                      onChange={e => updateExercise(i, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Sets"
                      value={ex.sets || ""}
                      onChange={e => updateExercise(i, "sets", e.target.value)}
                      className="w-16"
                    />
                    <Input
                      placeholder="Reps"
                      value={ex.reps || ""}
                      onChange={e => updateExercise(i, "reps", e.target.value)}
                      className="w-20"
                    />
                    {form.exercises.length > 1 && (
                      <button onClick={() => removeExercise(i)} className="mt-2 opacity-40 hover:opacity-70 transition-opacity">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Clinical Notes</Label>
              <Textarea
                placeholder="Any notes for the athlete or other staff..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <Button
              onClick={saveAssignment}
              disabled={savingAssignment || !form.title.trim()}
              className="w-full"
              style={{ background: "#a78bfa", color: "#fff" }}
            >
              {savingAssignment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Assignment"}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function AssignmentCard({
  assignment,
  onComplete,
  onDelete,
}: {
  assignment: Assignment
  onComplete: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isCompleted = assignment.status === "completed"

  return (
    <div
      className="rounded overflow-hidden"
      style={{ border: "1px solid var(--cream-dd, #e8e2d9)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: "var(--cream-d, #f7f4ef)" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-white"
            style={{
              background: assignment.type === "rehab" ? "#f97316" : "#a78bfa",
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {assignment.type}
          </span>
          <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
            {assignment.title}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {assignment.frequency && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
              {assignment.frequency}
            </span>
          )}
          {!isCompleted && (
            <button
              onClick={e => { e.stopPropagation(); onComplete() }}
              className="opacity-40 hover:opacity-80 transition-opacity"
              title="Mark complete"
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: "#16a34a" }} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="opacity-30 hover:opacity-70 transition-opacity"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" style={{ color: "#b83232" }} />
          </button>
          <ChevronRight
            className="h-3.5 w-3.5 transition-transform"
            style={{ color: "var(--muted)", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-3" style={{ background: "#fff" }}>
          {assignment.description && (
            <p style={{ fontSize: "13px", color: "var(--soft)", lineHeight: 1.6 }}>{assignment.description}</p>
          )}

          {assignment.exercises?.length > 0 && (
            <div>
              <p
                className="uppercase mb-1.5"
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1.5px", color: "var(--muted)" }}
              >
                Exercises
              </p>
              <div className="space-y-1">
                {assignment.exercises.map((ex, i) => (
                  <div key={i} className="flex items-baseline gap-2">
                    <span style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>{ex.name}</span>
                    {(ex.sets || ex.reps) && (
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--muted)" }}>
                        {[ex.sets && `${ex.sets} sets`, ex.reps && `${ex.reps} reps`].filter(Boolean).join(" × ")}
                      </span>
                    )}
                    {ex.notes && (
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>— {ex.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignment.duration_weeks && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
              Duration: {assignment.duration_weeks} week{assignment.duration_weeks !== 1 ? "s" : ""}
            </p>
          )}

          {assignment.notes && (
            <div
              className="p-2.5 rounded"
              style={{ background: "var(--cream-d, #f7f4ef)", fontSize: "12px", color: "var(--soft)", lineHeight: 1.6 }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted)" }}>
                Notes:{" "}
              </span>
              {assignment.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="w-full rounded-lg shadow-xl overflow-hidden"
        style={{ maxWidth: wide ? "560px" : "400px", background: "#fff" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)" }}
        >
          <h3
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "18px",
              letterSpacing: "0.5px",
              color: "var(--ink)",
            }}
          >
            {title}
          </h3>
          <button onClick={onClose} className="opacity-40 hover:opacity-70 transition-opacity">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
