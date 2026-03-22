import { Badge } from "@/components/ui/badge"
import { Dumbbell, BookOpen, Clock, ChevronRight, Loader2 } from "lucide-react"
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

function SectionCard({ title, icon: Icon, linkHref, children }: {
  title: string
  icon: React.ElementType
  linkHref: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white overflow-hidden rounded-lg" style={{ border: "1px solid var(--rule)" }}>
      <div
        className="flex items-center justify-between px-[18px] py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" style={{ color: "var(--ivy-mid)" }} />
          <span
            className="uppercase"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "2px",
              color: "var(--muted)",
            }}
          >
            {title}
          </span>
        </div>
        <Link
          href={linkHref}
          className="flex items-center gap-0.5 transition-colors hover:underline"
          style={{ fontSize: "11px", fontWeight: 500, color: "var(--ivy-mid)" }}
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div>{children}</div>
    </div>
  )
}

export function UpcomingItems({ workouts = [], academics = [], isLoading = false }: UpcomingItemsProps) {
  return (
    <div className="space-y-4">
      {/* Today's Training */}
      <SectionCard title="Today's Training" icon={Dumbbell} linkHref="/training">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : workouts.length === 0 ? (
          <p
            className="text-center py-5"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--muted)" }}
          >
            No training scheduled for today
          </p>
        ) : (
          workouts.map((workout, i) => (
            <div
              key={workout.id}
              className="flex items-center gap-3 px-[18px] py-2.5 transition-colors hover:bg-cream"
              style={{
                borderBottom: i < workouts.length - 1 ? "1px solid var(--cream-d)" : "none",
              }}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--muted)" }} />
              <span
                className="text-[12px] flex-1 truncate"
                style={{ color: "var(--ink)" }}
              >
                {workout.title}
              </span>
              <span
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--muted)" }}
              >
                {workout.time}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-sm uppercase",
                  workout.intensity === "high" && "bg-red-50 text-red-600",
                  workout.intensity === "medium" && "bg-amber-50 text-amber-600",
                  workout.intensity === "low" && "bg-ivy-pale text-ivy-mid",
                )}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1px" }}
              >
                {workout.intensity}
              </span>
            </div>
          ))
        )}
      </SectionCard>

      {/* Upcoming Deadlines */}
      <SectionCard title="Upcoming Deadlines" icon={BookOpen} linkHref="/academics">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : academics.length === 0 ? (
          <p
            className="text-center py-5"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "var(--muted)" }}
          >
            No upcoming deadlines
          </p>
        ) : (
          academics.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-[18px] py-2.5 transition-colors hover:bg-cream"
              style={{
                borderBottom: i < academics.length - 1 ? "1px solid var(--cream-d)" : "none",
                borderLeft: `3px solid ${item.priority === "high" ? "var(--red, #b83232)" : item.priority === "medium" ? "var(--gold)" : "var(--ivy-light)"}`,
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate" style={{ color: "var(--ink)" }}>{item.title}</p>
                <p
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}
                >
                  {item.course}
                </p>
              </div>
              <p
                className="shrink-0"
                style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 500, color: "var(--soft)" }}
              >
                {item.dueDate}
              </p>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  )
}
