"use client"

import { useState } from "react"
import useSWR from "swr"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  GraduationCap,
  Clock,
  MapPin,
  Check,
  ClipboardList,
  BookOpen,
  FileText,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ScheduleItem {
  id: string
  date: string
  completed: boolean
  type: string
  title: string
  item_type: "coach_workout" | "session" | "academic"
  // Workout specific
  start_time?: string
  end_time?: string
  location?: string
  is_optional?: boolean
  plan_name?: string
  coach_name?: string
  intensity?: string
  // Academic specific
  priority?: string
  due_date?: string
  course_name?: string
  course_code?: string
  // Session specific
  start_at?: string
  end_at?: string
  focus?: string
}

interface Course {
  id: string
  name: string
  code: string
  schedule: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = []
  const dayOfWeek = baseDate.getDay()
  const sunday = new Date(baseDate)
  sunday.setDate(baseDate.getDate() - dayOfWeek)

  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
    dates.push(date)
  }
  return dates
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0]
}

function formatTime(time: string | null | undefined): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

const ITEM_COLORS: Record<string, string> = {
  coach_workout: "border-l-primary bg-primary/5",
  session: "border-l-warning bg-warning/5",
  academic: "border-l-accent bg-accent/5",
}

const TYPE_COLORS: Record<string, string> = {
  practice: "bg-blue-500/20 text-blue-400",
  lift: "bg-purple-500/20 text-purple-400",
  strength: "bg-purple-500/20 text-purple-400",
  conditioning: "bg-orange-500/20 text-orange-400",
  competition: "bg-red-500/20 text-red-400",
  assignment: "bg-accent/20 text-accent",
  exam: "bg-destructive/20 text-destructive",
  quiz: "bg-warning/20 text-warning",
  project: "bg-success/20 text-success",
}

function ScheduleItemCard({ item }: { item: ScheduleItem }) {
  const itemColor = ITEM_COLORS[item.item_type] || ITEM_COLORS.session
  const typeColor = TYPE_COLORS[item.type] || "bg-muted text-muted-foreground"

  const getIcon = () => {
    switch (item.item_type) {
      case "coach_workout":
        return <ClipboardList className="h-3 w-3" />
      case "session":
        return <Dumbbell className="h-3 w-3" />
      case "academic":
        if (item.type === "exam") return <AlertCircle className="h-3 w-3" />
        if (item.type === "quiz") return <FileText className="h-3 w-3" />
        return <BookOpen className="h-3 w-3" />
      default:
        return <Calendar className="h-3 w-3" />
    }
  }

  const getTime = () => {
    if (item.start_time) return formatTime(item.start_time)
    if (item.start_at) {
      return new Date(item.start_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    }
    if (item.due_date) return "Due"
    return null
  }

  return (
    <div
      className={cn(
        "p-2 rounded-md border-l-2 text-xs transition-all hover:shadow-sm",
        itemColor,
        item.completed && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Badge className={cn("text-[10px] px-1 py-0 h-4", typeColor)}>
              {getIcon()}
              <span className="ml-0.5 capitalize">{item.type}</span>
            </Badge>
            {item.completed && (
              <Check className="h-3 w-3 text-success" />
            )}
          </div>
          <p className={cn(
            "font-medium truncate",
            item.completed && "line-through text-muted-foreground"
          )}>
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
            {getTime() && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {getTime()}
              </span>
            )}
            {item.location && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-2.5 w-2.5" />
                {item.location}
              </span>
            )}
            {item.course_code && (
              <span className="truncate">{item.course_code}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ScheduleContent() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const weekDates = getWeekDates(currentDate)

  const startDate = formatDateKey(weekDates[0])
  const endDate = formatDateKey(weekDates[6])

  const { data, isLoading } = useSWR(
    `/api/athletes/schedule?startDate=${startDate}&endDate=${endDate}`,
    fetcher
  )

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Group items by date
  const itemsByDate: Record<string, ScheduleItem[]> = {}
  weekDates.forEach((date) => {
    itemsByDate[formatDateKey(date)] = []
  })

  if (data) {
    // Add coach workouts
    data.assignedWorkouts?.forEach((item: ScheduleItem) => {
      const dateKey = item.date
      if (itemsByDate[dateKey]) {
        itemsByDate[dateKey].push({ ...item, item_type: "coach_workout" })
      }
    })

    // Add self sessions
    data.sessions?.forEach((item: ScheduleItem) => {
      const dateKey = item.date
      if (itemsByDate[dateKey]) {
        itemsByDate[dateKey].push({ ...item, item_type: "session" })
      }
    })

    // Add academics
    data.academics?.forEach((item: ScheduleItem) => {
      const dateKey = item.date
      if (itemsByDate[dateKey]) {
        itemsByDate[dateKey].push({ ...item, item_type: "academic" })
      }
    })
  }

  // Sort items within each day by time
  Object.keys(itemsByDate).forEach((dateKey) => {
    itemsByDate[dateKey].sort((a, b) => {
      const timeA = a.start_time || a.start_at || "23:59"
      const timeB = b.start_time || b.start_at || "23:59"
      return timeA.localeCompare(timeB)
    })
  })

  const today = formatDateKey(new Date())
  const isCurrentWeek = weekDates.some((d) => formatDateKey(d) === today)

  // Calculate stats
  const totalItems = Object.values(itemsByDate).flat().length
  const completedItems = Object.values(itemsByDate).flat().filter((i) => i.completed).length
  const workoutCount = Object.values(itemsByDate).flat().filter(
    (i) => i.item_type === "coach_workout" || i.item_type === "session"
  ).length
  const academicCount = Object.values(itemsByDate).flat().filter(
    (i) => i.item_type === "academic"
  ).length

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" />
            Schedule
          </h1>
          <p className="text-muted-foreground">Your weekly calendar at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isCurrentWeek ? "default" : "outline"}
            size="sm"
            onClick={goToToday}
            className={isCurrentWeek ? "gradient-primary" : ""}
          >
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Header */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {weekDates[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            {" - "}
            {weekDates[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-l-2 border-l-primary bg-primary/20" />
              <span className="text-muted-foreground">Coach</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-l-2 border-l-warning bg-warning/20" />
              <span className="text-muted-foreground">Personal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border-l-2 border-l-accent bg-accent/20" />
              <span className="text-muted-foreground">Academic</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold text-success">{completedItems}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold text-primary">{workoutCount}</p>
            <p className="text-xs text-muted-foreground">Workouts</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/50">
            <p className="text-2xl font-bold text-accent">{academicCount}</p>
            <p className="text-xs text-muted-foreground">Academics</p>
          </div>
        </div>

        {/* Calendar Grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => (
              <div key={formatDateKey(date)} className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-2" />
                <div className="h-32 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, index) => {
              const dateKey = formatDateKey(date)
              const isToday = dateKey === today
              const items = itemsByDate[dateKey] || []
              const isPast = date < new Date(today)

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "min-h-[160px] rounded-lg border transition-all",
                    isToday
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/50 bg-secondary/20",
                    isPast && !isToday && "opacity-60"
                  )}
                >
                  {/* Day Header */}
                  <div
                    className={cn(
                      "p-2 text-center border-b",
                      isToday ? "border-primary/30" : "border-border/30"
                    )}
                  >
                    <p className="text-xs text-muted-foreground">{DAYS[index]}</p>
                    <p
                      className={cn(
                        "text-lg font-semibold",
                        isToday ? "text-primary" : "text-foreground"
                      )}
                    >
                      {date.getDate()}
                    </p>
                  </div>

                  {/* Items */}
                  <div className="p-1.5 space-y-1.5 max-h-[200px] overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No items
                      </p>
                    ) : (
                      items.map((item) => (
                        <ScheduleItemCard key={`${item.item_type}-${item.id}`} item={item} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Today's Focus (if current week) */}
      {isCurrentWeek && itemsByDate[today]?.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Today's Focus
          </h3>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {itemsByDate[today]
              .filter((item) => !item.completed)
              .map((item) => (
                <ScheduleItemCard key={`today-${item.item_type}-${item.id}`} item={item} />
              ))}
          </div>
          {itemsByDate[today].filter((item) => !item.completed).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              All done for today!
            </p>
          )}
        </GlassCard>
      )}
    </div>
  )
}
