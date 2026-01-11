"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Activity, Trash2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobilityLog {
  id: string
  exercise_id: string
  exercise_name: string
  body_group: string
  date: string
  duration_minutes: number
  notes: string
}

interface MobilityHistoryProps {
  logs: MobilityLog[]
  onUpdate: () => void
}

const bodyGroupColors: Record<string, string> = {
  Back: "bg-primary/20 text-primary",
  Hips: "bg-accent/20 text-accent",
  Shoulders: "bg-warning/20 text-warning",
  Ankles: "bg-success/20 text-success",
  Knees: "bg-destructive/20 text-destructive",
  "Full Body": "bg-chart-2/20 text-chart-2",
}

export function MobilityHistory({ logs, onUpdate }: MobilityHistoryProps) {
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/athletes/mobility-logs/${id}`, { method: "DELETE" })
      onUpdate()
    } catch (error) {
      console.error("Failed to delete log:", error)
    }
  }

  // Group logs by date
  const groupedLogs = logs.reduce(
    (acc, log) => {
      if (!acc[log.date]) acc[log.date] = []
      acc[log.date].push(log)
      return acc
    },
    {} as Record<string, MobilityLog[]>,
  )

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (logs.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No mobility sessions logged</h3>
        <p className="text-muted-foreground">Start tracking your stretching and recovery work</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dayTotal = groupedLogs[date].reduce((acc, log) => acc + log.duration_minutes, 0)
        const isToday = date === new Date().toISOString().split("T")[0]

        return (
          <div key={date} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">
                {isToday
                  ? "Today"
                  : new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </h3>
              <Badge variant="outline" className="border-accent/50 text-accent">
                {dayTotal} min total
              </Badge>
            </div>

            <div className="space-y-2">
              {groupedLogs[date].map((log) => (
                <GlassCard key={log.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", bodyGroupColors[log.body_group] || "bg-secondary")}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{log.exercise_name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {log.body_group}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {log.duration_minutes} min
                          </span>
                        </div>
                        {log.notes && <p className="mt-2 text-sm text-muted-foreground">{log.notes}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(log.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
