"use client"

import { useState } from "react"
import { ClipboardCheck, Loader2, Trophy, AlertTriangle, ArrowRight, Heart } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface WeekReview {
  review: {
    overview: string
    wins: string[]
    concerns: string[]
    next_week: string[]
    mood_check: string | null
  }
}

export function WeekReviewCard() {
  const localDate = new Date().toISOString().split("T")[0]
  const { data, mutate } = useSWR<{ review: WeekReview | null }>(
    `/api/athletes/week-review?localDate=${localDate}`, fetcher
  )
  const [generating, setGenerating] = useState(false)

  async function generate() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/athletes/week-review?localDate=${localDate}`, { method: "POST" })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed")
      mutate()
      toast.success("Week review generated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate review")
    } finally {
      setGenerating(false)
    }
  }

  const review = data?.review?.review

  return (
    <div
      className="bg-white overflow-hidden"
      style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[18px] py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-3.5 w-3.5" style={{ color: "var(--ivy-mid)" }} />
          <span
            className="uppercase"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "var(--muted)" }}
          >
            Week in Review
          </span>
        </div>
      </div>

      {!review ? (
        <div className="px-[18px] py-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Get your personalized weekly analysis with wins, concerns, and next week's goals
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--ivy)" }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Generate Review
          </button>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: "var(--rule)" }}>
          {/* Overview */}
          <div className="px-[18px] py-3">
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
              {review.overview}
            </p>
          </div>

          {/* Mood check — if present, show first */}
          {review.mood_check && (
            <div className="px-[18px] py-3" style={{ background: "#faf5ff" }}>
              <div className="flex items-start gap-2">
                <Heart className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: "#a78bfa" }} />
                <p className="text-sm" style={{ color: "#6d28d9" }}>
                  {review.mood_check}
                </p>
              </div>
            </div>
          )}

          {/* Wins */}
          {review.wins?.length > 0 && (
            <div className="px-[18px] py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="h-3 w-3" style={{ color: "var(--gold)" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted)" }}>
                  Wins
                </span>
              </div>
              <div className="space-y-1.5">
                {review.wins.map((w, i) => (
                  <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--ink)" }}>
                    <span className="text-green-500 mt-px flex-shrink-0">+</span>
                    {w}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {review.concerns?.length > 0 && (
            <div className="px-[18px] py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3 w-3" style={{ color: "#dc2626" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted)" }}>
                  Watch Out
                </span>
              </div>
              <div className="space-y-1.5">
                {review.concerns.map((c, i) => (
                  <p key={i} className="text-xs" style={{ color: "var(--ink)" }}>
                    {c}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Next week recommendations */}
          {review.next_week?.length > 0 && (
            <div className="px-[18px] py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowRight className="h-3 w-3" style={{ color: "var(--ivy-mid)" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--muted)" }}>
                  This Week's Focus
                </span>
              </div>
              <div className="space-y-1.5">
                {review.next_week.map((r, i) => (
                  <p key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--ink)" }}>
                    <span className="font-bold flex-shrink-0" style={{ color: "var(--ivy-mid)" }}>{i + 1}.</span>
                    {r}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
