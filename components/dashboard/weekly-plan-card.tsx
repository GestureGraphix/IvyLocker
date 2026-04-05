"use client"

import { useState } from "react"
import { CalendarDays, Loader2, ChevronDown, Utensils, Moon, Activity, BookOpen, RefreshCw } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface DayPlan {
  summary: string
  food: string
  sleep: string
  mobility: string
  study: string
}

interface WeeklyPlan {
  days: Record<string, DayPlan>
}

const DAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
const DAY_LABELS: Record<string, string> = {
  sunday: "Sun", monday: "Mon", tuesday: "Tue", wednesday: "Wed",
  thursday: "Thu", friday: "Fri", saturday: "Sat",
}

export function WeeklyPlanCard() {
  const localDate = new Date().toISOString().split("T")[0]
  const { data, mutate } = useSWR<{ plan: WeeklyPlan | null; generatedAt?: string }>(
    `/api/athletes/weekly-plan?localDate=${localDate}`, fetcher
  )
  const [generating, setGenerating] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const today = new Date()
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  const todayName = dayNames[today.getDay()]

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/athletes/weekly-plan?localDate=${localDate}`, { method: "POST" })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed to generate")
      mutate()
      toast.success("Weekly plan generated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate plan")
    } finally {
      setGenerating(false)
    }
  }

  const plan = data?.plan

  return (
    <div
      className="bg-white overflow-hidden"
      style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[18px] py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
          <span
            className="uppercase"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "var(--muted)" }}
          >
            Weekly Plan
          </span>
        </div>
        {plan && (
          <button
            onClick={generate}
            disabled={generating}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Regenerate"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {!plan ? (
        /* Empty state */
        <div className="px-[18px] py-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Generate your personalized weekly plan for food, sleep, mobility, and studying
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--ivy)" }}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
            Generate Plan
          </button>
        </div>
      ) : (
        /* Day rows */
        <div>
          {DAY_ORDER.map((day) => {
            const d = plan.days?.[day]
            if (!d) return null
            const isToday = day === todayName
            const isExpanded = expandedDay === day

            return (
              <div key={day} style={{ borderBottom: "1px solid var(--rule)" }}>
                {/* Summary row */}
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="w-full flex items-center gap-3 px-[18px] py-2.5 text-left transition-colors hover:bg-[var(--cream-d)]"
                  style={{ background: isToday ? "var(--cream-d, #f7f4ef)" : "transparent" }}
                >
                  <span
                    className="w-8 text-center flex-shrink-0 font-medium"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px",
                      color: isToday ? "var(--ivy-mid)" : "var(--muted-foreground)",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {DAY_LABELS[day]}
                  </span>
                  {isToday && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "var(--ivy-mid)" }}
                    />
                  )}
                  <span
                    className="flex-1 text-xs truncate"
                    style={{ color: "var(--ink)" }}
                  >
                    {d.summary}
                  </span>
                  <ChevronDown
                    className="h-3 w-3 flex-shrink-0 transition-transform text-muted-foreground"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}
                  />
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    className="px-[18px] pb-3 pt-1 space-y-3"
                    style={{ background: "var(--cream-d, #f7f4ef)" }}
                  >
                    <div className="flex items-start gap-2.5">
                      <Utensils className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#ca8a04" }} />
                      <div className="flex-1">
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "3px" }}>Nutrition</p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>{d.food}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Moon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#6366f1" }} />
                      <div className="flex-1">
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "3px" }}>Sleep</p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>{d.sleep}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Activity className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                      <div className="flex-1">
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "3px" }}>Mobility & Recovery</p>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>{d.mobility}</p>
                      </div>
                    </div>
                    {d.study && d.study !== "No classes registered" && d.study !== "No data yet" && (
                      <div className="flex items-start gap-2.5">
                        <BookOpen className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#dc2626" }} />
                        <div className="flex-1">
                          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "3px" }}>Academics</p>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--ink)" }}>{d.study}</p>
                        </div>
                      </div>
                    )}
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
