"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, ChevronLeft, ChevronRight, ChevronDown, Search, Utensils, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import useSWR from "swr"
import { toast } from "sonner"

interface MenuItem {
  id: number
  menuItemId: number
  name: string
  description?: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
  servingSize?: string
  section?: string
}

interface MealSection {
  mealType: string
  items: MenuItem[]
}

interface MenuResponse {
  date: string
  location: string
  locationSlug: string
  meals: MealSection[]
  diningHalls: { slug: string; name: string }[]
  error?: string
}

interface YaleDiningMenuProps {
  onLogMeal: (meal: {
    meal_type: string
    description: string
    calories: number
    protein_grams: number
    carbs_grams: number
    fat_grams: number
  }) => Promise<void>
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

// Determine current meal based on time of day
function getCurrentMeal(): string {
  const hour = new Date().getHours()
  if (hour < 11) return "Breakfast"
  if (hour < 16) return "Lunch"
  return "Dinner"
}

export function YaleDiningMenu({ onLogMeal }: YaleDiningMenuProps) {
  const [selectedLocation, setSelectedLocation] = useState("branford-college")
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))
  const [searchQuery, setSearchQuery] = useState("")
  const [loggingItem, setLoggingItem] = useState<number | null>(null)
  const [loggedItems, setLoggedItems] = useState<Set<number>>(new Set())

  // Collapsible state - meals and sections
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set([getCurrentMeal()]))
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const { data, isLoading, error } = useSWR<MenuResponse>(
    `/api/yale-menu?date=${selectedDate}&location=${selectedLocation}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  // Auto-expand current meal when data loads
  useEffect(() => {
    if (data?.meals) {
      const currentMeal = getCurrentMeal()
      setExpandedMeals(new Set([currentMeal]))
      // Expand all sections of current meal by default
      const currentMealData = data.meals.find(m => m.mealType === currentMeal)
      if (currentMealData) {
        const sections = new Set<string>()
        currentMealData.items.forEach(item => {
          if (item.section) sections.add(`${currentMeal}-${item.section}`)
        })
        setExpandedSections(sections)
      }
    }
  }, [data])

  const toggleMeal = (mealType: string) => {
    setExpandedMeals(prev => {
      const next = new Set(prev)
      if (next.has(mealType)) {
        next.delete(mealType)
      } else {
        next.add(mealType)
      }
      return next
    })
  }

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionKey)) {
        next.delete(sectionKey)
      } else {
        next.add(sectionKey)
      }
      return next
    })
  }

  const handlePrevDay = () => {
    const date = new Date(selectedDate + "T12:00:00")
    date.setDate(date.getDate() - 1)
    setSelectedDate(formatDate(date))
  }

  const handleNextDay = () => {
    const date = new Date(selectedDate + "T12:00:00")
    date.setDate(date.getDate() + 1)
    setSelectedDate(formatDate(date))
  }

  const handleLogItem = async (item: MenuItem, mealType: string) => {
    setLoggingItem(item.menuItemId)

    try {
      await onLogMeal({
        meal_type: mealType.toLowerCase(),
        description: item.name,
        calories: item.calories,
        protein_grams: item.proteinG,
        carbs_grams: item.carbsG,
        fat_grams: item.fatG,
      })

      setLoggedItems((prev) => new Set([...prev, item.menuItemId]))
      toast.success(`Added ${item.name}`, {
        description: `${item.calories} cal, ${item.proteinG}g protein`,
      })
    } catch (err) {
      toast.error("Failed to log meal")
    } finally {
      setLoggingItem(null)
    }
  }

  // Filter items by search query
  const filterItems = (items: MenuItem[]) => {
    if (!searchQuery.trim()) return items
    const query = searchQuery.toLowerCase()
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    )
  }

  const diningHalls = data?.diningHalls || []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-10 w-10">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-secondary/50 rounded-lg text-center min-w-[140px]">
            <span className="font-medium">{formatDisplayDate(selectedDate)}</span>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextDay} className="h-10 w-10">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Location Selector */}
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-full sm:w-[200px] bg-secondary/50 border-border/50">
            <SelectValue placeholder="Select dining hall" />
          </SelectTrigger>
          <SelectContent>
            {diningHalls.map((hall) => (
              <SelectItem key={hall.slug} value={hall.slug}>
                {hall.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary/50 border-border/50"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading menu...</p>
          </div>
        </GlassCard>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Utensils className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Failed to load menu. Please try again.</p>
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isLoading && !error && data?.meals?.length === 0 && (
        <GlassCard className="p-8">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <Utensils className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No menu available for this date.</p>
            <p className="text-sm text-muted-foreground">Try selecting a different day or dining hall.</p>
          </div>
        </GlassCard>
      )}

      {/* Menu Sections */}
      {!isLoading && data?.meals?.map((meal) => {
        const filteredItems = filterItems(meal.items)
        if (filteredItems.length === 0) return null

        const isMealExpanded = expandedMeals.has(meal.mealType)

        // Group items by section
        const sections = new Map<string, MenuItem[]>()
        for (const item of filteredItems) {
          const section = item.section || "Other"
          if (!sections.has(section)) {
            sections.set(section, [])
          }
          sections.get(section)!.push(item)
        }

        return (
          <GlassCard key={meal.mealType} className="overflow-hidden">
            {/* Meal Header - Clickable */}
            <button
              onClick={() => toggleMeal(meal.mealType)}
              className="w-full flex items-center justify-between p-4 -m-4 mb-0 hover:bg-secondary/30 transition-colors rounded-t-xl"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    meal.mealType === "Breakfast" && "bg-warning",
                    meal.mealType === "Lunch" && "bg-success",
                    meal.mealType === "Dinner" && "bg-primary"
                  )}
                />
                {meal.mealType}
                <span className="text-sm font-normal text-muted-foreground">
                  ({filteredItems.length} items)
                </span>
              </h3>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  isMealExpanded && "rotate-180"
                )}
              />
            </button>

            {/* Meal Content - Collapsible */}
            {isMealExpanded && (
              <div className="space-y-3 mt-4 pt-4 border-t border-border/30">
                {Array.from(sections.entries()).map(([sectionName, sectionItems]) => {
                  const sectionKey = `${meal.mealType}-${sectionName}`
                  const isSectionExpanded = expandedSections.has(sectionKey)

                  return (
                    <div key={sectionName} className="rounded-lg bg-secondary/20">
                      {/* Section Header - Clickable */}
                      <button
                        onClick={() => toggleSection(sectionKey)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors rounded-lg"
                      >
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {sectionName}
                          <span className="ml-2 text-muted-foreground/60">
                            ({sectionItems.length})
                          </span>
                        </h4>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            isSectionExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      {/* Section Items - Collapsible */}
                      {isSectionExpanded && (
                        <div className="grid gap-2 p-2 pt-0">
                          {sectionItems.map((item) => {
                            const isLogging = loggingItem === item.menuItemId
                            const isLogged = loggedItems.has(item.menuItemId)

                            return (
                              <div
                                key={item.menuItemId}
                                className={cn(
                                  "flex items-center justify-between gap-3 p-3 rounded-lg transition-colors",
                                  "bg-secondary/30 hover:bg-secondary/50",
                                  isLogged && "bg-success/10 border border-success/20"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">{item.name}</p>
                                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                    <span className="text-success font-medium">{item.calories} cal</span>
                                    <span>P: {item.proteinG}g</span>
                                    <span>C: {item.carbsG}g</span>
                                    <span>F: {item.fatG}g</span>
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  variant={isLogged ? "outline" : "default"}
                                  onClick={() => handleLogItem(item, meal.mealType)}
                                  disabled={isLogging}
                                  className={cn(
                                    "h-9 min-w-[80px]",
                                    !isLogged && "gradient-primary glow-primary",
                                    isLogged && "border-success text-success"
                                  )}
                                >
                                  {isLogging ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : isLogged ? (
                                    <>
                                      <Check className="h-4 w-4 mr-1" />
                                      Added
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-1" />
                                      Log
                                    </>
                                  )}
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </GlassCard>
        )
      })}

      {/* Quick Stats */}
      {loggedItems.size > 0 && (
        <GlassCard className="p-4 bg-success/10 border-success/20">
          <p className="text-sm text-success font-medium">
            ✓ {loggedItems.size} item{loggedItems.size !== 1 ? "s" : ""} logged from today's menu
          </p>
        </GlassCard>
      )}
    </div>
  )
}
