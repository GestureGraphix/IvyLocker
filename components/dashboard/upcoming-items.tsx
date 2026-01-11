import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Dumbbell, BookOpen, Clock, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Workout {
  id: string
  title: string
  time: string
  type: string
  intensity: string
}

interface AcademicItem {
  id: string
  title: string
  course: string
  dueDate: string
  priority: string
}

interface UpcomingItemsProps {
  workouts?: Workout[]
  academics?: AcademicItem[]
  isLoading?: boolean
}

export function UpcomingItems({ workouts = [], academics = [], isLoading = false }: UpcomingItemsProps) {
  const upcomingWorkouts = workouts
  const upcomingAcademics = academics
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Upcoming Workouts */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-warning" />
            Today's Training
          </h3>
          <Link href="/training" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingWorkouts.map((workout) => (
            <div
              key={workout.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{workout.title}</p>
                  <p className="text-sm text-muted-foreground">{workout.time}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  workout.intensity === "high" && "border-destructive text-destructive",
                  workout.intensity === "medium" && "border-warning text-warning",
                  workout.intensity === "low" && "border-success text-success",
                )}
              >
                {workout.intensity}
              </Badge>
            </div>
          ))}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : upcomingWorkouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No training scheduled for today</p>
          ) : null}
        </div>
      </GlassCard>

      {/* Upcoming Academics */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Upcoming Deadlines
          </h3>
          <Link href="/academics" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingAcademics.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.course}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{item.dueDate}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    item.priority === "high" && "border-destructive text-destructive",
                    item.priority === "medium" && "border-warning text-warning",
                    item.priority === "low" && "border-success text-success",
                  )}
                >
                  {item.priority}
                </Badge>
              </div>
            </div>
          ))}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : upcomingAcademics.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No upcoming deadlines</p>
          ) : null}
        </div>
      </GlassCard>
    </div>
  )
}
