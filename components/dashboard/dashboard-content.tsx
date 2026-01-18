"use client"

import { useEffect, useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { StatCard } from "@/components/ui/stat-card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { CheckInWidget } from "./check-in-widget"
import { DailyRecommendationCard } from "./daily-recommendation-card"
import { UpcomingItems } from "./upcoming-items"
import { Droplets, Utensils, Dumbbell, Brain, TrendingUp } from "lucide-react"
import { DashboardSkeleton } from "@/components/ui/skeletons"

interface DashboardData {
  hydration: { current: number; goal: number }
  meals: { count: number; calories: number; protein: number; calorieGoal: number; proteinGoal: number }
  sessions: { completed: number; total: number }
  wellnessScore: string | null
  upcomingSessions: Array<{ id: string; title: string; type: string; time: string; intensity: string }>
  upcomingAcademics: Array<{ id: string; title: string; course: string; dueDate: string; priority: string }>
}

interface DashboardContentProps {
  userName?: string
}

export function DashboardContent({ userName = "Athlete" }: DashboardContentProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        // Send local date to API to ensure correct day filtering
        const localDate = new Date()
        const dateStr = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`

        const res = await fetch(`/api/athletes/dashboard?date=${dateStr}`)
        if (res.ok) {
          const dashboardData = await res.json()
          setData(dashboardData)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const todayStats = data || {
    hydration: { current: 0, goal: 100 },
    meals: { count: 0, calories: 0, protein: 0, calorieGoal: 2500, proteinGoal: 150 },
    sessions: { completed: 0, total: 0 },
    wellnessScore: null,
  }

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
          value={`${todayStats.hydration.current} oz`}
          icon={Droplets}
          variant="primary"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard label="Meals Logged" value={todayStats.meals.count} icon={Utensils} variant="success" />
        <StatCard
          label="Training"
          value={`${todayStats.sessions.completed}/${todayStats.sessions.total}`}
          icon={Dumbbell}
          variant="warning"
        />
        <StatCard label="Wellness Score" value={todayStats.wellnessScore || "—"} icon={Brain} />
      </div>

      {/* Progress Bars */}
      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Hydration Progress
          </h3>
          <ProgressBar
            value={todayStats.hydration.current}
            max={todayStats.hydration.goal}
            label="Today's intake"
            variant="primary"
            size="lg"
          />
          <p className="mt-3 text-sm text-muted-foreground">
            {todayStats.hydration.goal - todayStats.hydration.current} oz remaining to hit your goal
          </p>
        </GlassCard>

        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Nutrition Summary
          </h3>
          <div className="space-y-3">
            <ProgressBar value={todayStats.meals.calories} max={todayStats.meals.calorieGoal || 2500} label="Calories" variant="success" size="md" />
            <ProgressBar value={todayStats.meals.protein} max={todayStats.meals.proteinGoal || 150} label="Protein (g)" variant="primary" size="md" />
          </div>
        </GlassCard>
      </div>

      {/* Upcoming Items */}
      <UpcomingItems
        workouts={data?.upcomingSessions || []}
        academics={data?.upcomingAcademics || []}
        isLoading={isLoading}
      />
    </div>
  )
}
