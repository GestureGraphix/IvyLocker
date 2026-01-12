"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Droplets, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface HydrationLog {
  id: string
  ounces: number
  source: string
  time: string
  date: string
}

// Get local date string in YYYY-MM-DD format (not UTC)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface HydrationTrackerProps {
  logs: HydrationLog[]
  onUpdate: () => void
}

export function HydrationTracker({ logs, onUpdate }: HydrationTrackerProps) {
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/athletes/hydration-logs/${id}`, { method: "DELETE" })
      onUpdate()
    } catch (error) {
      console.error("Failed to delete hydration log:", error)
    }
  }

  // Group by date
  const groupedLogs = logs.reduce(
    (acc, log) => {
      if (!acc[log.date]) acc[log.date] = []
      acc[log.date].push(log)
      return acc
    },
    {} as Record<string, HydrationLog[]>,
  )

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (logs.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No hydration logged</h3>
        <p className="text-muted-foreground">Start tracking your water intake</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dayTotal = groupedLogs[date].reduce((acc, log) => acc + Number(log.ounces || 0), 0)
        const isToday = date === getLocalDateString()

        return (
          <div key={date} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {isToday
                  ? "Today"
                  : new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </h3>
              <Badge variant="outline" className="border-primary/50 text-primary">
                {dayTotal} oz total
              </Badge>
            </div>

            <GlassCard>
              <div className="space-y-2">
                {groupedLogs[date]
                  .sort((a, b) => b.time.localeCompare(a.time))
                  .map((log, index) => (
                    <div
                      key={log.id}
                      className={cn(
                        "flex items-center justify-between py-2",
                        index !== groupedLogs[date].length - 1 && "border-b border-border/50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Droplets className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">{log.ounces} oz</span>
                        <Badge variant="secondary" className="text-xs">
                          {log.source}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{log.time}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(log.id)}>
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </GlassCard>
          </div>
        )
      })}
    </div>
  )
}
