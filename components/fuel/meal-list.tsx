"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Coffee, Sun, Moon, Cookie, Trash2 } from "lucide-react"

interface Meal {
  id: string
  meal_type: string
  description: string
  calories: number
  protein_grams: number
  carbs_grams: number
  fat_grams: number
  date_time: string
}

interface MealListProps {
  meals: Meal[]
  onUpdate: () => void
}

const mealTypeIcons = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
}

const mealTypeColors = {
  breakfast: "bg-warning/20 text-warning",
  lunch: "bg-success/20 text-success",
  dinner: "bg-primary/20 text-primary",
  snack: "bg-accent/20 text-accent",
}

export function MealList({ meals, onUpdate }: MealListProps) {
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meal log?")) return

    try {
      await fetch(`/api/athletes/meal-logs/${id}`, { method: "DELETE" })
      onUpdate()
    } catch (error) {
      console.error("Failed to delete meal:", error)
    }
  }

  // Group meals by date
  const groupedMeals = meals.reduce(
    (acc, meal) => {
      const date = new Date(meal.date_time).toDateString()
      if (!acc[date]) acc[date] = []
      acc[date].push(meal)
      return acc
    },
    {} as Record<string, Meal[]>,
  )

  const sortedDates = Object.keys(groupedMeals).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (meals.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No meals logged yet</h3>
        <p className="text-muted-foreground">Start tracking your nutrition by logging a meal</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {date === new Date().toDateString()
              ? "Today"
              : date === new Date(Date.now() - 86400000).toDateString()
                ? "Yesterday"
                : new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </h3>

          <div className="space-y-2">
            {groupedMeals[date].map((meal) => {
              const Icon = mealTypeIcons[meal.meal_type as keyof typeof mealTypeIcons] || Coffee
              const colorClass = mealTypeColors[meal.meal_type as keyof typeof mealTypeColors] || mealTypeColors.snack

              return (
                <GlassCard key={meal.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", colorClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {meal.meal_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(meal.date_time).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-foreground mt-1">{meal.description}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{meal.calories} cal</span>
                          <span>{meal.protein_grams}g protein</span>
                          <span>{meal.carbs_grams}g carbs</span>
                          <span>{meal.fat_grams}g fat</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(meal.id)} className="shrink-0">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
