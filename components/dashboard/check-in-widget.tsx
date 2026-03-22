"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Brain, Heart, CheckCircle2, Loader2 } from "lucide-react"

export function CheckInWidget() {
  const [mentalState, setMentalState] = useState<number | null>(null)
  const [physicalState, setPhysicalState] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchTodayCheckIn() {
      try {
        const res = await fetch("/api/athletes/check-in/today")
        if (res.ok) {
          const data = await res.json()
          if (data.checkIn) {
            setMentalState(data.checkIn.mental_state)
            setPhysicalState(data.checkIn.physical_state)
            setNotes(data.checkIn.notes || "")
            setHasCheckedIn(true)
            setIsExpanded(false)
          }
        }
      } catch (error) {
        console.error("Failed to fetch check-in:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTodayCheckIn()
  }, [])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/athletes/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentalState, physicalState, notes }),
      })
      if (res.ok) {
        setHasCheckedIn(true)
        setIsExpanded(false)
        toast.success("Check-in saved!")
      } else {
        toast.error("Failed to save check-in")
      }
    } catch (error) {
      console.error("Failed to submit check-in:", error)
      toast.error("Failed to save check-in")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--ivy-mid)" }} />
        </div>
      </Card>
    )
  }

  if (hasCheckedIn && !isExpanded) {
    return (
      <Card
        className="cursor-pointer hover:border-ivy-mid transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5" style={{ color: "var(--ivy-mid)" }} />
            <div>
              <p className="font-medium text-[14px]" style={{ color: "var(--ink)" }}>
                Daily Check-in Complete
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  color: "var(--muted)",
                }}
              >
                Mental: {mentalState}/10 · Physical: {physicalState}/10
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle>Daily Check-in</CardTitle>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "var(--muted)",
            }}
          >
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Mental State */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-1.5"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "var(--soft)",
            }}
          >
            <Brain className="h-3.5 w-3.5" style={{ color: "var(--ivy)" }} />
            Mental State
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setMentalState(num)}
                className={cn(
                  "flex-1 py-2 text-[12px] font-medium transition-all rounded-sm",
                )}
                style={{
                  background: mentalState === num ? "var(--ivy)" : "var(--cream-d)",
                  color: mentalState === num ? "var(--cream)" : "var(--soft)",
                  border: mentalState === num ? "1px solid var(--ivy)" : "1px solid var(--cream-dd)",
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Physical State */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-1.5"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "var(--soft)",
            }}
          >
            <Heart className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
            Physical State
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setPhysicalState(num)}
                className={cn(
                  "flex-1 py-2 text-[12px] font-medium transition-all rounded-sm",
                )}
                style={{
                  background: physicalState === num ? "var(--gold)" : "var(--cream-d)",
                  color: physicalState === num ? "var(--black, #0c0c0c)" : "var(--soft)",
                  border: physicalState === num ? "1px solid var(--gold)" : "1px solid var(--cream-dd)",
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            Notes (optional)
          </label>
          <Textarea
            placeholder="How are you feeling today? Any specific areas of concern?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none bg-white border-rule text-foreground placeholder:text-muted-foreground"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!mentalState || !physicalState || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
          ) : hasCheckedIn ? (
            "Update Check-in"
          ) : (
            "Complete Check-in"
          )}
        </Button>
      </div>
    </Card>
  )
}

function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={cn("bg-white rounded-lg overflow-hidden", className)}
      style={{ border: "1px solid var(--rule)" }}
      onClick={onClick}
    >
      <div className="p-5">{children}</div>
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px",
        letterSpacing: "2px",
        color: "var(--muted)",
      }}
    >
      {children}
    </p>
  )
}
