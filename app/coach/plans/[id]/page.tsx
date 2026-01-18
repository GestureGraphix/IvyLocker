"use client"

import { use } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  ArrowLeft,
  Send,
  Trash2,
  Clock,
  MapPin,
  Users,
  Loader2,
  Coffee,
  Dumbbell,
} from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

interface Exercise {
  id: string
  name: string
  details: string | null
  sort_order: number
  groups: { id: string; name: string; slug: string }[]
}

interface Session {
  id: string
  session_type: string
  title: string | null
  start_time: string | null
  end_time: string | null
  location: string | null
  is_optional: boolean
  sort_order: number
  groups: { id: string; name: string; slug: string }[]
  exercises: Exercise[]
}

interface Day {
  id: string
  day_of_week: number
  is_off_day: boolean
  notes: string | null
  sessions: Session[]
}

interface Plan {
  id: string
  name: string
  week_start_date: string
  status: "draft" | "published" | "archived"
  source_text: string | null
  created_at: string
  published_at: string | null
  days: Day[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

const SESSION_COLORS: Record<string, string> = {
  practice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lift: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  conditioning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  recovery: "bg-green-500/20 text-green-400 border-green-500/30",
  competition: "bg-red-500/20 text-red-400 border-red-500/30",
  optional: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  published: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{ plan: Plan }>(
    `/api/coach/plans/${id}`,
    fetcher
  )

  const plan = data?.plan

  const handlePublish = async () => {
    if (!plan || plan.status === "published") return

    setIsPublishing(true)

    try {
      const res = await fetch(`/api/coach/plans/${id}/publish`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish plan")
      }

      toast.success(data.message || "Plan published!")
      mutate()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish plan"
      toast.error(message)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this plan? This cannot be undone.")) {
      return
    }

    setIsDeleting(true)

    try {
      const res = await fetch(`/api/coach/plans/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Plan deleted")
        router.push("/coach/plans")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete plan")
      }
    } catch (error) {
      toast.error("Failed to delete plan")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return null
    // Time is in HH:MM:SS format from DB
    const [hours, minutes] = time.split(":")
    const h = parseInt(hours)
    const ampm = h >= 12 ? "pm" : "am"
    const h12 = h % 12 || 12
    return `${h12}:${minutes}${ampm}`
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="p-4 md:p-8">
        <GlassCard className="text-center py-8">
          <p className="text-destructive">Plan not found</p>
          <Link href="/coach/plans">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plans
            </Button>
          </Link>
        </GlassCard>
      </div>
    )
  }

  // Sort days by day_of_week
  const sortedDays = [...plan.days].sort((a, b) => a.day_of_week - b.day_of_week)

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/coach/plans" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              {plan.name}
            </h1>
            <Badge variant="outline" className={STATUS_STYLES[plan.status]}>
              {plan.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Week of {new Date(plan.week_start_date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plan.status === "draft" && (
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="gradient-primary"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publish
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete
          </Button>
        </div>
      </div>

      {/* Days */}
      <div className="space-y-4">
        {sortedDays.map((day) => (
          <GlassCard key={day.id}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {DAY_NAMES[day.day_of_week]}
              </h3>
              {day.is_off_day && (
                <Badge variant="secondary">
                  <Coffee className="h-3 w-3 mr-1" />
                  Off Day
                </Badge>
              )}
            </div>

            {!day.is_off_day && day.sessions.length > 0 && (
              <div className="space-y-3">
                {day.sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border ${SESSION_COLORS[session.session_type]}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4" />
                        <span className="font-medium capitalize">
                          {session.title || session.session_type}
                        </span>
                        {session.is_optional && (
                          <Badge variant="outline" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {session.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(session.start_time)}
                            {session.end_time && ` - ${formatTime(session.end_time)}`}
                          </span>
                        )}
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {session.groups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {session.groups.map((g) => (
                          <Badge key={g.id} variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {g.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {session.exercises.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {session.exercises.map((exercise) => (
                          <li key={exercise.id} className="flex items-start gap-2">
                            <span className="text-muted-foreground">-</span>
                            <div className="flex-1">
                              <span className="font-medium">{exercise.name}</span>
                              {exercise.details && (
                                <span className="text-muted-foreground ml-1">
                                  ({exercise.details})
                                </span>
                              )}
                              {exercise.groups.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {exercise.groups.map((g) => (
                                    <Badge key={g.id} variant="outline" className="text-xs">
                                      {g.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!day.is_off_day && day.sessions.length === 0 && (
              <p className="text-muted-foreground text-sm">No sessions</p>
            )}
          </GlassCard>
        ))}
      </div>

      {/* Source Text */}
      {plan.source_text && (
        <GlassCard>
          <h3 className="font-semibold mb-2">Original Text</h3>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-3 rounded-lg">
            {plan.source_text}
          </pre>
        </GlassCard>
      )}
    </div>
  )
}
