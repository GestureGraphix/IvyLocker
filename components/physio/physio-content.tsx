"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Activity, Stethoscope, ExternalLink, UserPlus, X, Check, MessageSquare, AlertTriangle } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Assignment {
  id: string
  title: string
  type: "prehab" | "rehab"
  description: string | null
  frequency: string | null
  physio_name: string
  physio_scheduling_link: string | null
  status: string
}

interface PlanLog {
  id: string
  assignment_id: string
  logged_date: string
  notes: string | null
  pain_level: number | null
  created_at: string
  plan_title: string
  plan_type: string
}

interface Physio {
  id: string
  name: string
  email: string
  scheduling_link: string | null
  linked: boolean
}

export function PhysioContent() {
  const [activeTab, setActiveTab] = useState("rehab")
  const [loggingPlan, setLoggingPlan] = useState<string | null>(null)
  const [logNotes, setLogNotes] = useState("")
  const [logPain, setLogPain] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPhysioPicker, setShowPhysioPicker] = useState(false)
  const [linkingPhysio, setLinkingPhysio] = useState<string | null>(null)

  const { data: assignmentsData, mutate: mutateAssignments } = useSWR("/api/athletes/physio-assignments", fetcher)
  const { data: logsData, mutate: mutateLogs } = useSWR("/api/athletes/physio-logs", fetcher)
  const { data: physiosData, mutate: mutatePhysios } = useSWR<{ physios: Physio[] }>("/api/athletes/physio", fetcher)

  const assignments: Assignment[] = assignmentsData?.assignments || []
  const logs: PlanLog[] = logsData?.logs || []
  const allPhysios = physiosData?.physios || []
  const linkedPhysios = allPhysios.filter((p) => p.linked)
  const unlinkedPhysios = allPhysios.filter((p) => !p.linked)

  const rehabPlans = assignments.filter((a) => a.type === "rehab" && a.status === "active")
  const prehabPlans = assignments.filter((a) => a.type === "prehab" && a.status === "active")
  const rehabLogs = logs.filter((l) => l.plan_type === "rehab")
  const prehabLogs = logs.filter((l) => l.plan_type === "prehab")

  async function handleLogSession(assignmentId: string) {
    setSaving(true)
    try {
      const res = await fetch("/api/athletes/physio-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, notes: logNotes.trim() || null, pain_level: logPain }),
      })
      if (!res.ok) throw new Error()
      toast.success("Session logged!")
      setLoggingPlan(null)
      setLogNotes("")
      setLogPain(null)
      mutateLogs()
    } catch {
      toast.error("Failed to log session")
    } finally {
      setSaving(false)
    }
  }

  async function linkPhysio(physioId: string) {
    setLinkingPhysio(physioId)
    try {
      const res = await fetch("/api/athletes/physio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ physioId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to link")
      toast.success(data.message)
      mutatePhysios()
      mutateAssignments()
      setShowPhysioPicker(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add physio")
    } finally {
      setLinkingPhysio(null)
    }
  }

  async function unlinkPhysio(physioId: string) {
    if (!confirm("Remove this physio? Their plans will no longer appear.")) return
    try {
      await fetch(`/api/athletes/physio?physioId=${physioId}`, { method: "DELETE" })
      toast.success("Physio removed")
      mutatePhysios()
      mutateAssignments()
    } catch {
      toast.error("Failed to remove physio")
    }
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const renderPlans = (plans: Assignment[], planLogs: PlanLog[]) => {
    if (plans.length === 0) return null

    return (
      <div className="space-y-3">
        {plans.map((plan) => {
          const isLogging = loggingPlan === plan.id
          const thisLogs = planLogs.filter((l) => l.assignment_id === plan.id)

          return (
            <GlassCard key={plan.id} className="overflow-hidden">
              {/* Plan header */}
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Stethoscope className="h-4 w-4 flex-shrink-0" style={{ color: plan.type === "rehab" ? "#f97316" : "#a78bfa" }} />
                    <div>
                      <p className="text-sm font-semibold">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.physio_name}
                        {plan.frequency && ` · ${plan.frequency}`}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isLogging ? "ghost" : "outline"}
                    onClick={() => {
                      if (isLogging) { setLoggingPlan(null) }
                      else { setLoggingPlan(plan.id); setLogNotes(""); setLogPain(null) }
                    }}
                    className="text-xs"
                  >
                    {isLogging ? <X className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                    {isLogging ? "Cancel" : "Log Session"}
                  </Button>
                </div>
              </div>

              {/* Plan text */}
              {plan.description && (
                <div
                  className="px-4 py-3"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "12px",
                    lineHeight: "1.8",
                    color: "var(--ink)",
                    whiteSpace: "pre-wrap",
                    borderBottom: (isLogging || thisLogs.length > 0) ? "1px solid var(--border)" : "none",
                  }}
                >
                  {plan.description}
                </div>
              )}

              {/* Log form */}
              {isLogging && (
                <div className="px-4 py-3 space-y-3" style={{ background: "var(--cream-d, #f9f7f3)", borderBottom: thisLogs.length > 0 ? "1px solid var(--border)" : "none" }}>
                  <textarea
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="How did it go? Any pain, tightness, or things to note..."
                    rows={3}
                    autoFocus
                    className="w-full rounded-md border px-3 py-2 text-sm bg-white text-foreground outline-none resize-none"
                    style={{ borderColor: "var(--border)", fontFamily: "'DM Mono', monospace", fontSize: "12px", lineHeight: "1.7" }}
                  />

                  {/* Pain level */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Pain level (optional)</p>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <button
                          key={n}
                          onClick={() => setLogPain(logPain === n ? null : n)}
                          className="w-7 h-7 rounded text-xs font-medium transition-colors"
                          style={{
                            background: logPain === n
                              ? n <= 3 ? "#22c55e" : n <= 6 ? "#eab308" : "#ef4444"
                              : "var(--background)",
                            color: logPain === n ? "#fff" : "var(--muted-foreground)",
                            border: `1px solid ${logPain === n ? "transparent" : "var(--border)"}`,
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleLogSession(plan.id)}
                    disabled={saving}
                    style={{ background: plan.type === "rehab" ? "#f97316" : "#a78bfa", color: "#fff" }}
                  >
                    {saving ? <div className="h-3.5 w-3.5 border-2 border-t-transparent border-white rounded-full animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                    Log Session
                  </Button>
                </div>
              )}

              {/* Recent logs for this plan */}
              {thisLogs.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Recent Logs</p>
                  {thisLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="flex items-start gap-2 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="text-[11px] text-muted-foreground w-12 flex-shrink-0 pt-0.5">
                        {formatDate(log.logged_date || log.created_at)}
                      </span>
                      <div className="flex-1 min-w-0">
                        {log.notes && (
                          <p style={{ fontSize: "12px", color: "var(--ink)", lineHeight: 1.5 }}>{log.notes}</p>
                        )}
                        {!log.notes && (
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
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {log.pain_level}/10
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )
        })}
      </div>
    )
  }

  const renderLogHistory = (planLogs: PlanLog[]) => {
    if (planLogs.length === 0) return null

    return (
      <div className="space-y-2 mt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Session History</p>
        {planLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs text-muted-foreground w-16 flex-shrink-0 pt-0.5">
              {formatDate(log.logged_date || log.created_at)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: log.plan_type === "rehab" ? "#f97316" : "#a78bfa" }}>
                {log.plan_title}
              </p>
              {log.notes && (
                <p className="text-sm mt-0.5" style={{ color: "var(--ink)" }}>{log.notes}</p>
              )}
              {!log.notes && (
                <p className="text-xs text-muted-foreground italic mt-0.5">Session completed</p>
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
                <AlertTriangle className="h-2.5 w-2.5" />
                {log.pain_level}/10
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="flex items-center gap-2"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "1px", color: "var(--ink)" }}
        >
          <Activity className="h-6 w-6" style={{ color: "var(--ivy-mid)" }} />
          Physio
        </h1>
        <p className="text-muted-foreground text-sm">Rehab and prehab tracking</p>
      </div>

      {/* My Physios */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">My Physios</p>
          <button
            onClick={() => setShowPhysioPicker((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground"
            style={{ color: "var(--ivy-mid)" }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Physio
          </button>
        </div>

        {showPhysioPicker && (
          <div className="mb-3 rounded-lg border border-border bg-secondary/20 overflow-hidden">
            {unlinkedPhysios.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                {allPhysios.length === 0 ? "No physios available yet" : "You're linked to all available physios"}
              </p>
            ) : (
              unlinkedPhysios.map((p) => (
                <button
                  key={p.id}
                  onClick={() => linkPhysio(p.id)}
                  disabled={linkingPhysio === p.id}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  {linkingPhysio === p.id ? (
                    <div className="h-4 w-4 border-2 border-t-transparent border-current rounded-full animate-spin text-muted-foreground" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {linkedPhysios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No physio linked yet. Click "Add Physio" to connect with your physical therapist.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedPhysios.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#a78bfa" }}>
                    {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.scheduling_link && (
                    <a
                      href={p.scheduling_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-white"
                      style={{ background: "#a78bfa" }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Book
                    </a>
                  )}
                  <button
                    onClick={() => unlinkPhysio(p.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove physio"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="rehab">Rehab</TabsTrigger>
          <TabsTrigger value="prehab">Prehab</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rehab">
          {rehabPlans.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No active rehab plans</p>
            </GlassCard>
          ) : (
            renderPlans(rehabPlans, rehabLogs)
          )}
        </TabsContent>

        <TabsContent value="prehab">
          {prehabPlans.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No active prehab plans</p>
            </GlassCard>
          ) : (
            renderPlans(prehabPlans, prehabLogs)
          )}
        </TabsContent>

        <TabsContent value="history">
          {logs.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No sessions logged yet</p>
            </GlassCard>
          ) : (
            <GlassCard className="p-4">
              {renderLogHistory(logs)}
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
