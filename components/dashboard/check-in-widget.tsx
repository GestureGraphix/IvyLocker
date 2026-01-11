"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Brain, Heart, Sparkles, Loader2 } from "lucide-react"

export function CheckInWidget() {
  const [mentalState, setMentalState] = useState<number | null>(null)
  const [physicalState, setPhysicalState] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch today's check-in on mount
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
      <GlassCard>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </GlassCard>
    )
  }

  if (hasCheckedIn && !isExpanded) {
    return (
      <GlassCard glow="success" className="cursor-pointer" onClick={() => setIsExpanded(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Sparkles className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">Daily Check-in Complete</p>
              <p className="text-sm text-muted-foreground">
                Mental: {mentalState}/10 • Physical: {physicalState}/10
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard glow="primary">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Daily Check-in
          </h3>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>

        {/* Mental State */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Mental State
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setMentalState(num)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  mentalState === num
                    ? "gradient-primary text-white glow-primary"
                    : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground",
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Physical State */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" />
            Physical State
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => setPhysicalState(num)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  physicalState === num
                    ? "bg-accent text-white glow-accent"
                    : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground",
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Notes (optional)</label>
          <Textarea
            placeholder="How are you feeling today? Any specific areas of concern?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-secondary/50 border-border/50 resize-none"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!mentalState || !physicalState || isSubmitting}
          className="w-full gradient-primary hover:opacity-90 glow-primary"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : hasCheckedIn ? (
            "Update Check-in"
          ) : (
            "Complete Check-in"
          )}
        </Button>
      </div>
    </GlassCard>
  )
}
