"use client"

import { ProgressBar } from "@/components/ui/progress-bar"
import { CheckInWidget } from "./check-in-widget"
import { DailyRecommendationCard } from "./daily-recommendation-card"
import { UpcomingItems } from "./upcoming-items"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import { PhysioSessionsCard } from "./physio-sessions-card"
import { WeeklySummaryCard } from "./weekly-summary-card"
import { LogCoreCard } from "./log-core-card"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface DashboardContentProps {
  userName?: string
}

export function DashboardContent({ userName = "Athlete" }: DashboardContentProps) {
  const localDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`

  const { data: userData } = useSWR("/api/me", fetcher)
  const { data: mealsData, isLoading: mealsLoading } = useSWR("/api/athletes/meal-logs", fetcher)
  const { data: hydrationData, isLoading: hydrationLoading } = useSWR(`/api/athletes/hydration-logs?date=${localDate}`, fetcher)
  const { data: sessionsData } = useSWR("/api/athletes/sessions", fetcher)
  const { data: checkInData } = useSWR("/api/athletes/check-in/today", fetcher)
  const { data: academicsData } = useSWR("/api/athletes/academics", fetcher)

  const isLoading = mealsLoading || hydrationLoading

  const meals = mealsData?.meals || []
  const todayDateStr = new Date().toDateString()
  const todayMeals = meals.filter((m: { date_time: string }) =>
    new Date(m.date_time).toDateString() === todayDateStr
  )

  const mealTotals = todayMeals.reduce(
    (acc: { calories: number; protein: number }, meal: { calories: number; protein_grams: number }) => ({
      calories: acc.calories + Number(meal.calories || 0),
      protein: acc.protein + Number(meal.protein_grams || 0),
    }),
    { calories: 0, protein: 0 }
  )

  const todayHydration = hydrationData?.todayTotal || 0

  const userProfile = userData?.user
  const goals = {
    calories: Number(userProfile?.calorie_goal) || 2500,
    protein: Number(userProfile?.protein_goal_grams) || 150,
    hydration: Number(userProfile?.hydration_goal_oz) || 100,
  }

  const sessions = sessionsData?.sessions || []
  const todaySessions = sessions.filter((s: { start_at: string }) =>
    new Date(s.start_at).toDateString() === todayDateStr
  )

  const checkIn = checkInData?.checkIn
  const wellnessScore = checkIn
    ? ((Number(checkIn.mental_state) + Number(checkIn.physical_state)) / 2).toFixed(1)
    : null

  const upcomingSessions = todaySessions
    .filter((s: { completed: boolean }) => !s.completed)
    .slice(0, 5)
    .map((s: { id: string; title: string; type: string; start_at: string; intensity: string }) => ({
      id: s.id,
      title: s.title,
      type: s.type,
      time: new Date(s.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      intensity: s.intensity,
    }))

  const academics = academicsData?.items || []
  const upcomingAcademics = academics
    .filter((a: { completed: boolean; due_date: string }) => {
      if (a.completed) return false
      const dueDate = new Date(a.due_date)
      const today = new Date()
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      return dueDate >= today && dueDate <= weekFromNow
    })
    .slice(0, 5)
    .map((a: { id: string; title: string; due_date: string; priority: string; course?: { code: string } }) => ({
      id: a.id,
      title: a.title,
      course: a.course?.code || "General",
      dueDate: formatDueDate(new Date(a.due_date)),
      priority: a.priority,
    }))

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div>
      <div className="p-6 md:p-7 space-y-5">
        {/* AI Coach Note */}
        <DailyRecommendationCard />

        {/* Data Strip — 4-col stats */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 bg-white overflow-hidden"
          style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
        >
          <DataCell
            label="Hydration"
            value={todayHydration}
            unit="oz"
            delta={todayHydration >= goals.hydration ? "goal reached" : `${goals.hydration - todayHydration} remaining`}
            deltaType={todayHydration >= goals.hydration ? "up" : "neutral"}
            progress={todayHydration / goals.hydration}
            accentColor="var(--ivy-light)"
          />
          <DataCell
            label="Calories"
            value={mealTotals.calories}
            unit="kcal"
            delta={`of ${goals.calories} goal`}
            deltaType="neutral"
            progress={mealTotals.calories / goals.calories}
            accentColor="var(--gold)"
          />
          <DataCell
            label="Protein"
            value={mealTotals.protein}
            unit="g"
            delta={`of ${goals.protein}g goal`}
            deltaType={mealTotals.protein >= goals.protein ? "up" : "neutral"}
            progress={mealTotals.protein / goals.protein}
            accentColor="var(--blue, #2563eb)"
          />
          <DataCell
            label="Wellness"
            value={wellnessScore || "—"}
            unit={wellnessScore ? "/10" : ""}
            delta="daily check-in"
            deltaType={wellnessScore && parseFloat(wellnessScore) >= 7 ? "up" : "neutral"}
            progress={wellnessScore ? parseFloat(wellnessScore) / 10 : 0}
            accentColor="var(--red, #b83232)"
          />
        </div>

        {/* Main 2-col grid */}
        <div className="grid md:grid-cols-[1fr_340px] gap-5">
          {/* Left column */}
          <div className="space-y-5">
            {/* Daily Check-in */}
            <CheckInWidget />

            {/* Progress */}
            <div
              className="bg-white overflow-hidden"
              style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
            >
              <div
                className="flex items-center justify-between px-[18px] py-3"
                style={{ borderBottom: "1px solid var(--rule)" }}
              >
                <span
                  className="uppercase text-muted-foreground"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px" }}
                >
                  Nutrition Progress
                </span>
              </div>
              <div className="p-[18px] space-y-4">
                <ProgressBar value={mealTotals.calories} max={goals.calories} label="Calories" variant="primary" size="md" />
                <ProgressBar value={mealTotals.protein} max={goals.protein} label="Protein (g)" variant="success" size="md" />
                <ProgressBar value={todayHydration} max={goals.hydration} label="Hydration (oz)" variant="warning" size="md" />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Upcoming items */}
            <UpcomingItems
              workouts={upcomingSessions}
              academics={upcomingAcademics}
              isLoading={false}
            />
            {/* Quick core workout */}
            <LogCoreCard />
            {/* Weekly summary */}
            <WeeklySummaryCard />
            {/* Physio prehab/rehab assignments */}
            <PhysioSessionsCard />
          </div>
        </div>
      </div>
    </div>
  )
}

function DataCell({
  label,
  value,
  unit,
  delta,
  deltaType,
  progress,
  accentColor,
}: {
  label: string
  value: string | number
  unit?: string
  delta?: string
  deltaType?: "up" | "down" | "neutral"
  progress?: number
  accentColor?: string
}) {
  const deltaColor = {
    up: "var(--ivy-mid)",
    down: "var(--red, #b83232)",
    neutral: "var(--muted)",
  }[deltaType || "neutral"]

  return (
    <div
      className="relative px-5 py-[18px]"
      style={{ borderRight: "1px solid var(--rule)" }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor }}
      />
      <p
        className="uppercase mb-2"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "8px",
          letterSpacing: "2px",
          color: "var(--muted)",
        }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "44px",
            lineHeight: 1,
            letterSpacing: "0.5px",
            color: "var(--ink)",
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              color: "var(--muted)",
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {delta && (
        <p
          className="mt-1"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px",
            color: deltaColor,
          }}
        >
          {delta}
        </p>
      )}
      {progress !== undefined && (
        <div
          className="h-[2px] mt-2.5 rounded-sm overflow-hidden"
          style={{ background: "var(--cream-d)" }}
        >
          <div
            className="h-full rounded-sm"
            style={{
              width: `${Math.min(progress * 100, 100)}%`,
              background: accentColor,
            }}
          />
        </div>
      )}
    </div>
  )
}

function formatDueDate(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  if (targetDate.getTime() === today.getTime()) return "Today"
  if (targetDate.getTime() === tomorrow.getTime()) return "Tomorrow"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
