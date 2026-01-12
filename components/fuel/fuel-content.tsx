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

// Demo data
const demoMeals = [
  {
    id: "1",
    meal_type: "breakfast",
    description: "Oatmeal with berries and protein shake",
    calories: 520,
    protein_grams: 35,
    carbs_grams: 65,
    fat_grams: 12,
    date_time: new Date().toISOString(),
  },
  {
    id: "2",
    meal_type: "lunch",
    description: "Grilled chicken salad with quinoa",
    calories: 680,
    protein_grams: 45,
    carbs_grams: 55,
    fat_grams: 18,
    date_time: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    meal_type: "snack",
    description: "Greek yogurt with almonds",
    calories: 250,
    protein_grams: 18,
    carbs_grams: 20,
    fat_grams: 12,
    date_time: new Date(Date.now() - 7200000).toISOString(),
  },
]

const demoHydration = [
  { id: "1", ounces: 16, source: "water", time: "08:00", date: new Date().toISOString().split("T")[0] },
  { id: "2", ounces: 20, source: "water", time: "10:30", date: new Date().toISOString().split("T")[0] },
  { id: "3", ounces: 12, source: "sports drink", time: "12:00", date: new Date().toISOString().split("T")[0] },
  { id: "4", ounces: 16, source: "water", time: "14:30", date: new Date().toISOString().split("T")[0] },
]

export function FuelContent() {
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false)
  const [isHydrationDialogOpen, setIsHydrationDialogOpen] = useState(false)

  // Fetch user profile for goals
  const { data: userData } = useSWR("/api/me", fetcher)

  const { data: mealsData, mutate: mutateMeals } = useSWR("/api/athletes/meal-logs", fetcher, {
    fallbackData: { meals: demoMeals },
  })

  const { data: hydrationData, mutate: mutateHydration } = useSWR("/api/athletes/hydration-logs", fetcher, {
    revalidateOnFocus: true,
  })

  const meals = mealsData?.meals || demoMeals
  const hydrationLogs = hydrationData?.logs || []

  // Calculate today's totals
  const today = new Date().toDateString()
  const todayMeals = meals.filter((m: { date_time: string }) => new Date(m.date_time).toDateString() === today)

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

  const todayHydration = hydrationLogs
    .filter((h: { date: string }) => h.date === new Date().toISOString().split("T")[0])
    .reduce((acc: number, log: { ounces: number }) => acc + Number(log.ounces || 0), 0)

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

      {/* Hydration Quick View */}
      <GlassCard glow="primary">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Today's Hydration
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setIsHydrationDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <ProgressBar
          value={todayHydration}
          max={goals.hydration}
          label="Daily intake (oz)"
          variant="primary"
          size="lg"
        />
        <p className="text-sm text-muted-foreground mt-2">
          {todayHydration >= goals.hydration
            ? "Great job! You've hit your hydration goal!"
            : `${goals.hydration - todayHydration} oz to go`}
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
        onSuccess={() => mutateHydration()}
      />
    </div>
  )
}
