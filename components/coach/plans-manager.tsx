"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Plus,
  ArrowLeft,
  FileText,
  Send,
  Trash2,
  Clock,
  Users,
  Loader2,
  Eye,
} from "lucide-react"
import { toast } from "sonner"

interface Plan {
  id: string
  name: string
  week_start_date: string
  status: "draft" | "published" | "archived"
  created_at: string
  published_at: string | null
  training_days: number
  total_sessions: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  published: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export function PlansManager() {
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{ plans: Plan[] }>(
    "/api/coach/plans",
    fetcher
  )

  const plans = data?.plans || []

  const handlePublish = async (plan: Plan) => {
    if (plan.status === "published") return

    setPublishingId(plan.id)

    try {
      const res = await fetch(`/api/coach/plans/${plan.id}/publish`, {
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
      setPublishingId(null)
    }
  }

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) {
      return
    }

    setDeletingId(plan.id)

    try {
      const res = await fetch(`/api/coach/plans/${plan.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Plan deleted")
        mutate()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete plan")
      }
    } catch (error) {
      toast.error("Failed to delete plan")
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatWeekRange = (startDateStr: string) => {
    const start = new Date(startDateStr)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`
  }

  const draftCount = plans.filter((p) => p.status === "draft").length
  const publishedCount = plans.filter((p) => p.status === "published").length

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/coach" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              Weekly Plans
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create and manage weekly training plans for your athletes
          </p>
        </div>
        <Link href="/coach/plans/new">
          <Button className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-primary">{plans.length}</div>
          <div className="text-sm text-muted-foreground">Total Plans</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-yellow-400">{draftCount}</div>
          <div className="text-sm text-muted-foreground">Drafts</div>
        </GlassCard>
        <GlassCard className="text-center hidden md:block">
          <div className="text-3xl font-bold text-success">{publishedCount}</div>
          <div className="text-sm text-muted-foreground">Published</div>
        </GlassCard>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-muted rounded" />
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="text-center py-8">
          <p className="text-destructive">Failed to load plans</p>
        </GlassCard>
      ) : plans.length === 0 ? (
        <GlassCard className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No plans yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first weekly training plan
          </p>
          <Link href="/coach/plans/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Plan
            </Button>
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <GlassCard
              key={plan.id}
              className="hover:border-primary/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{plan.name}</h3>
                      <Badge variant="outline" className={STATUS_STYLES[plan.status]}>
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Week of {formatWeekRange(plan.week_start_date)}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {plan.training_days} training days
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {plan.total_sessions} sessions
                      </span>
                      <span>Created {formatDate(plan.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/coach/plans/${plan.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  {plan.status === "draft" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePublish(plan)}
                      disabled={publishingId === plan.id}
                    >
                      {publishingId === plan.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-1" />
                      )}
                      Publish
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(plan)}
                    disabled={deletingId === plan.id}
                  >
                    {deletingId === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
