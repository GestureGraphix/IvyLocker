"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { StatCard } from "@/components/ui/stat-card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { CheckInWidget } from "./check-in-widget"
import { DailyRecommendationCard } from "./daily-recommendation-card"
import { UpcomingItems } from "./upcoming-items"
import { Droplets, Utensils, Dumbbell, Brain, TrendingUp } from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeletons"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface DashboardContentProps {
  userName?: string
}

export function DashboardContent({ userName = "Athlete" }: DashboardContentProps) {
  // Get local date for API calls
  const localDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`

  // Fetch data from the same endpoints as fuel page for consistency
  const { data: userData } = useSWR("/api/me", fetcher)
  const { data: mealsData, isLoading: mealsLoading } = useSWR("/api/athletes/meal-logs", fetcher)
  const { data: hydrationData, isLoading: hydrationLoading } = useSWR(`/api/athletes/hydration-logs?date=${localDate}`, fetcher)
  const { data: sessionsData } = useSWR("/api/athletes/sessions", fetcher)
  const { data: checkInData } = useSWR("/api/athletes/check-in/today", fetcher)
  const { data: academicsData } = useSWR("/api/athletes/academics", fetcher)

  const isLoading = mealsLoading || hydrationLoading

  // Calculate today's meal totals (same logic as fuel page)
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

  // Get today's hydration total directly from API
  const todayHydration = hydrationData?.todayTotal || 0

  // Get goals from user profile
  const userProfile = userData?.user
  const goals = {
    calories: Number(userProfile?.calorie_goal) || 2500,
    protein: Number(userProfile?.protein_goal_grams) || 150,
    hydration: Number(userProfile?.hydration_goal_oz) || 100,
  }

  // Calculate sessions for today
  const sessions = sessionsData?.sessions || []
  const todaySessions = sessions.filter((s: { start_at: string }) =>
    new Date(s.start_at).toDateString() === todayDateStr
  )
  const completedSessions = todaySessions.filter((s: { completed: boolean }) => s.completed).length

  // Wellness score from check-in
  const checkIn = checkInData?.checkIn
  const wellnessScore = checkIn
    ? ((Number(checkIn.mental_state) + Number(checkIn.physical_state)) / 2).toFixed(1)
    : null

  // Upcoming items
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

  const firstName = userName.split(" ")[0]

  // Get time-based greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {greeting}, <span className="gradient-text">{firstName}</span>
        </h1>
        <p className="text-muted-foreground">Here's your performance overview for today</p>
      </div>

      {/* Daily Check-in */}
      <CheckInWidget />

      {/* AI Daily Recommendations */}
      <DailyRecommendationCard />

      {/* Today's Progress Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Hydration"
          value={`${todayHydration} oz`}
          icon={Droplets}
          variant="primary"
        />
        <StatCard label="Meals Logged" value={todayMeals.length} icon={Utensils} variant="success" />
        <StatCard
          label="Training"
          value={`${completedSessions}/${todaySessions.length}`}
          icon={Dumbbell}
          variant="warning"
        />
        <StatCard label="Wellness Score" value={wellnessScore || "—"} icon={Brain} />
      </div>

      {/* Progress Bars */}
      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Hydration Progress
          </h3>
          <ProgressBar
            value={todayHydration}
            max={goals.hydration}
            label="Today's intake"
            variant="primary"
            size="lg"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            {todayHydration >= goals.hydration
              ? "Great job! You've hit your hydration goal!"
              : `${goals.hydration - todayHydration} oz remaining to hit your goal`}
          </p>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Nutrition Summary
          </h3>
          <div className="space-y-3">
            <ProgressBar value={mealTotals.calories} max={goals.calories} label="Calories" variant="success" size="md" />
            <ProgressBar value={mealTotals.protein} max={goals.protein} label="Protein (g)" variant="primary" size="md" />
          </div>
        </GlassCard>
      </div>

      {/* Upcoming Items */}
      <UpcomingItems
        workouts={upcomingSessions}
        academics={upcomingAcademics}
        isLoading={false}
      />
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

  if (targetDate.getTime() === today.getTime()) {
    return "Today"
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return "Tomorrow"
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}
