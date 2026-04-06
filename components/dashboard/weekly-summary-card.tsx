"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Brain, Heart, Utensils, Droplets, Dumbbell, Stethoscope, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface WeeklySummary {
  weekStart: string
  weekEnd: string
  checkedInDays: number
  wellness: {
    mentalAvg: number | null
    physicalAvg: number | null
    checkInDays: number
    soreness: { area: string; count: number }[]
  }
  nutrition: {
    daysTracked: number
    avgCalories: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
    calorieGoal: number
    proteinGoal: number
    calorieGap: number
    proteinGap: number
  }
  hydration: {
    daysTracked: number
    avgOz: number
    goal: number
    gap: number
  }
  workouts: {
    byType: Record<string, { total: number; completed: number }>
    totalAssigned: number
    totalCompleted: number
  }
  physio: {
    sessionsLogged: number
    byType: Record<string, number>
  }
}

function getSunday(offset: number = 0): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day + offset * 7)
  return sunday.toISOString().split("T")[0]
}

export function WeeklySummaryCard() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = getSunday(weekOffset)

  const { data } = useSWR<WeeklySummary>(
    `/api/athletes/weekly-summary?weekStart=${weekStart}`,
    fetcher
  )

  if (!data) return null

  const weekLabel = (() => {
    const start = new Date(weekStart + "T12:00:00")
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    if (weekOffset === 0) return "This Week"
    if (weekOffset === -1) return "Last Week"
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  })()

  const gapIcon = (gap: number) => {
    if (gap > 0) return <TrendingUp className="h-3 w-3" />
    if (gap < 0) return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const gapColor = (gap: number, inverse = false) => {
    if (gap === 0) return "var(--muted-foreground)"
    // For most metrics, over goal is neutral, under is concerning
    if (inverse) return gap > 0 ? "#dc2626" : "#16a34a"
    return gap >= 0 ? "#16a34a" : "#dc2626"
  }

  const wellnessColor = (score: number | null) => {
    if (!score) return "var(--muted-foreground)"
    if (score >= 7) return "#16a34a"
    if (score >= 4) return "#ca8a04"
    return "#dc2626"
  }

  const completionPct = data.workouts.totalAssigned > 0
    ? Math.round((data.workouts.totalCompleted / data.workouts.totalAssigned) * 100)
    : null

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
        <span
          className="uppercase"
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "var(--muted)" }}
        >
          Weekly Summary
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--ink)", minWidth: "80px", textAlign: "center" }}>
            {weekLabel}
          </span>
          <button
            onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
            disabled={weekOffset >= 0}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--rule)" }}>
          {/* Wellness */}
          <div className="px-[18px] py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Brain className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
                <span className="text-xs text-muted-foreground">Mental</span>
                <span className="text-sm font-bold ml-auto" style={{ color: wellnessColor(data.wellness.mentalAvg) }}>
                  {data.wellness.mentalAvg ?? "—"}<span className="text-[10px] font-normal text-muted-foreground">/10</span>
                </span>
              </div>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-2 flex-1">
                <Heart className="h-3.5 w-3.5" style={{ color: "#f97316" }} />
                <span className="text-xs text-muted-foreground">Physical</span>
                <span className="text-sm font-bold ml-auto" style={{ color: wellnessColor(data.wellness.physicalAvg) }}>
                  {data.wellness.physicalAvg ?? "—"}<span className="text-[10px] font-normal text-muted-foreground">/10</span>
                </span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {data.wellness.checkInDays} check-in{data.wellness.checkInDays !== 1 ? "s" : ""} this week
            </p>
          </div>

          {/* Hydration */}
          <div className="px-[18px] py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" style={{ color: "#3b82f6" }} />
                <span className="text-xs text-muted-foreground">Hydration</span>
              </div>
              <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: gapColor(data.hydration.gap) }}>
                {gapIcon(data.hydration.gap)}
                {data.hydration.avgOz > 0 ? `${data.hydration.avgOz}oz` : "—"}<span className="text-muted-foreground font-normal">/{data.hydration.goal}oz avg</span>
              </span>
            </div>
          </div>

          {/* Physio */}
          {data.physio.sessionsLogged > 0 && (
            <div className="px-[18px] py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
                  <span className="text-xs text-muted-foreground">Physio</span>
                </div>
                <div className="flex gap-2">
                  {Object.entries(data.physio.byType).map(([type, count]) => (
                    <span key={type} className="text-[11px] capitalize">
                      {count} {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Nutrition */}
          <div className="px-[18px] py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Utensils className="h-3.5 w-3.5" style={{ color: "#ca8a04" }} />
              <span className="text-xs text-muted-foreground">Nutrition</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{data.nutrition.daysTracked}d tracked</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Calories</span>
                <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: gapColor(data.nutrition.calorieGap) }}>
                  {gapIcon(data.nutrition.calorieGap)}
                  {data.nutrition.avgCalories > 0 ? `${data.nutrition.avgCalories}` : "—"}<span className="text-muted-foreground font-normal">/{data.nutrition.calorieGoal}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Protein</span>
                <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: gapColor(data.nutrition.proteinGap) }}>
                  {gapIcon(data.nutrition.proteinGap)}
                  {data.nutrition.avgProtein > 0 ? `${data.nutrition.avgProtein}g` : "—"}<span className="text-muted-foreground font-normal">/{data.nutrition.proteinGoal}g</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Carbs</span>
                <span className="text-[11px] text-muted-foreground">{data.nutrition.avgCarbs > 0 ? `${data.nutrition.avgCarbs}g avg` : "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Fat</span>
                <span className="text-[11px] text-muted-foreground">{data.nutrition.avgFat > 0 ? `${data.nutrition.avgFat}g avg` : "—"}</span>
              </div>
            </div>
          </div>

          {/* Workouts */}
          <div className="px-[18px] py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Dumbbell className="h-3.5 w-3.5" style={{ color: "var(--ivy-mid)" }} />
              <span className="text-xs text-muted-foreground">Workouts</span>
              {completionPct !== null && (
                <span
                  className="text-[10px] font-medium ml-auto px-1.5 py-0.5 rounded"
                  style={{
                    background: completionPct >= 80 ? "#dcfce7" : completionPct >= 50 ? "#fef9c3" : "#fee2e2",
                    color: completionPct >= 80 ? "#16a34a" : completionPct >= 50 ? "#ca8a04" : "#dc2626",
                  }}
                >
                  {completionPct}% complete
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.workouts.byType).map(([type, counts]) => (
                <span key={type} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-foreground">
                  <span className="capitalize">{type}</span>{" "}
                  <span className="text-muted-foreground">{counts.completed}/{counts.total}</span>
                </span>
              ))}
              {data.workouts.totalAssigned === 0 && (
                <span className="text-[11px] text-muted-foreground">No workouts this week</span>
              )}
            </div>
          </div>

          {/* Soreness */}
          {data.wellness.soreness.length > 0 && (
            <div className="px-[18px] py-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#dc2626" }} />
                <span className="text-xs text-muted-foreground">Sore Areas</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.wellness.soreness.map((s) => (
                  <span
                    key={s.area}
                    className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                    style={{ background: "#fee2e2", color: "#dc2626" }}
                  >
                    {s.area} ({s.count}x)
                  </span>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
