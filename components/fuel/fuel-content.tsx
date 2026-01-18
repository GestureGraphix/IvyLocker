"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MealList } from "./meal-list"
import { HydrationTracker } from "./hydration-tracker"
import { AddMealDialog } from "./add-meal-dialog"
import { AddHydrationDialog } from "./add-hydration-dialog"
import { YaleDiningMenu } from "./yale-dining-menu"
import { Plus, Utensils, Droplets, Flame, Beef, Building2 } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Default goals (used as fallback if profile not loaded)
const DEFAULT_GOALS = {
  calories: 2500,
  protein: 150,
  hydration: 100,
}

// Get local date string in YYYY-MM-DD format (not UTC)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function FuelContent() {
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false)
  const [isHydrationDialogOpen, setIsHydrationDialogOpen] = useState(false)

  // Get local date for API calls
  const localDate = getLocalDateString()

  // Fetch user profile for goals
  const { data: userData } = useSWR("/api/me", fetcher)

  const { data: mealsData, mutate: mutateMeals } = useSWR("/api/athletes/meal-logs", fetcher)

  const { data: hydrationData, mutate: mutateHydration } = useSWR(`/api/athletes/hydration-logs?date=${localDate}`, fetcher, {
    revalidateOnFocus: true,
  })

  const meals = mealsData?.meals || []
  const hydrationLogs = hydrationData?.logs || []

  // Calculate today's meal totals using local date
  const todayDateStr = new Date().toDateString()
  const todayMeals = meals.filter((m: { date_time: string }) =>
    new Date(m.date_time).toDateString() === todayDateStr
  )

  const todayTotals = todayMeals.reduce(
    (
      acc: { calories: number; protein: number; carbs: number; fat: number },
      meal: { calories: number; protein_grams: number; carbs_grams: number; fat_grams: number },
    ) => ({
      calories: acc.calories + Number(meal.calories || 0),
      protein: acc.protein + Number(meal.protein_grams || 0),
      carbs: acc.carbs + Number(meal.carbs_grams || 0),
      fat: acc.fat + Number(meal.fat_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  // Get today's hydration total directly from API
  const todayHydration = hydrationData?.todayTotal || 0

  // Goals from user profile
  const userProfile = userData?.user
  const goals = {
    calories: Number(userProfile?.calorie_goal) || DEFAULT_GOALS.calories,
    protein: Number(userProfile?.protein_goal_grams) || DEFAULT_GOALS.protein,
    hydration: Number(userProfile?.hydration_goal_oz) || DEFAULT_GOALS.hydration,
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Utensils className="h-7 w-7 text-success" />
            Fuel
          </h1>
          <p className="text-muted-foreground">Track your nutrition and hydration</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsHydrationDialogOpen(true)} variant="outline" className="border-primary/50">
            <Droplets className="h-4 w-4 mr-2 text-primary" />
            Log Water
          </Button>
          <Button onClick={() => setIsMealDialogOpen(true)} className="gradient-primary glow-primary">
            <Plus className="h-4 w-4 mr-2" />
            Log Meal
          </Button>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Flame className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Calories</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{todayTotals.calories}</p>
          <ProgressBar
            value={todayTotals.calories}
            max={goals.calories}
            showValue={false}
            variant="success"
            size="sm"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">{goals.calories - todayTotals.calories} remaining</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Beef className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Protein</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{todayTotals.protein}g</p>
          <ProgressBar
            value={todayTotals.protein}
            max={goals.protein}
            showValue={false}
            variant="primary"
            size="sm"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">{goals.protein - todayTotals.protein}g remaining</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <span className="text-warning font-bold text-sm">C</span>
            </div>
            <span className="text-sm text-muted-foreground">Carbs</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{todayTotals.carbs}g</p>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <span className="text-accent font-bold text-sm">F</span>
            </div>
            <span className="text-sm text-muted-foreground">Fat</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{todayTotals.fat}g</p>
        </GlassCard>
      </div>

      {/* Hydration Progress - same style as dashboard */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Hydration Progress
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setIsHydrationDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
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

      {/* Tabs for Meals, Yale Dining, and Hydration History */}
      <Tabs defaultValue="yale-dining" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="yale-dining" className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Yale Dining</span>
            <span className="sm:hidden">Dining</span>
          </TabsTrigger>
          <TabsTrigger value="meals">My Meals</TabsTrigger>
          <TabsTrigger value="hydration">Hydration</TabsTrigger>
        </TabsList>

        <TabsContent value="yale-dining">
          <YaleDiningMenu
            onLogMeal={async (meal) => {
              await fetch("/api/athletes/meal-logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...meal,
                  date_time: new Date().toISOString(),
                }),
              })
              mutateMeals()
            }}
          />
        </TabsContent>

        <TabsContent value="meals">
          <MealList meals={meals} onUpdate={() => mutateMeals()} />
        </TabsContent>

        <TabsContent value="hydration">
          <HydrationTracker logs={hydrationLogs} onUpdate={() => mutateHydration()} />
        </TabsContent>
      </Tabs>

      <AddMealDialog open={isMealDialogOpen} onOpenChange={setIsMealDialogOpen} onSuccess={() => mutateMeals()} />
      <AddHydrationDialog
        open={isHydrationDialogOpen}
        onOpenChange={setIsHydrationDialogOpen}
        onSuccess={() => {
          // Revalidate hydration data from server
          mutateHydration()
        }}
      />
    </div>
  )
}
