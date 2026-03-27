"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Brain, Heart, CheckCircle2, Loader2 } from "lucide-react"
import { BodyMap } from "./body-map"

export function CheckInWidget() {
  const [mentalState, setMentalState] = useState<number | null>(null)
  const [physicalState, setPhysicalState] = useState<number | null>(null)
  const [sorenessAreas, setSorenessAreas] = useState<string[]>([])
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
            setSorenessAreas(data.checkIn.soreness_areas || [])
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
        body: JSON.stringify({ mentalState, physicalState, sorenessAreas, notes }),
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
                {sorenessAreas.length > 0 && ` · ${sorenessAreas.length} sore area${sorenessAreas.length !== 1 ? "s" : ""}`}
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
                className={cn("flex-1 py-2 text-[12px] font-medium transition-all rounded-sm")}
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
                className={cn("flex-1 py-2 text-[12px] font-medium transition-all rounded-sm")}
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

        {/* Soreness Body Map */}
        <div className="space-y-2">
          <label
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "var(--soft)",
              display: "block",
            }}
          >
            Soreness — tap areas that feel sore
          </label>

          <div
            className="rounded-lg p-4"
            style={{ background: "var(--cream-d, #f7f4ef)", border: "1px solid var(--cream-dd, #e8e2d9)" }}
          >
            <BodyMap selected={sorenessAreas} onChange={setSorenessAreas} />
          </div>

          {sorenessAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sorenessAreas.map(id => {
                const allZones = [
                  { id: "head", label: "Head" }, { id: "neck", label: "Neck" },
                  { id: "l-shoulder", label: "L Shoulder" }, { id: "r-shoulder", label: "R Shoulder" },
                  { id: "chest", label: "Chest" }, { id: "l-bicep", label: "L Bicep" },
                  { id: "r-bicep", label: "R Bicep" }, { id: "core", label: "Core" },
                  { id: "l-forearm", label: "L Forearm" }, { id: "r-forearm", label: "R Forearm" },
                  { id: "l-hip", label: "L Hip" }, { id: "r-hip", label: "R Hip" },
                  { id: "l-quad", label: "L Quad" }, { id: "r-quad", label: "R Quad" },
                  { id: "l-knee", label: "L Knee" }, { id: "r-knee", label: "R Knee" },
                  { id: "l-shin", label: "L Shin" }, { id: "r-shin", label: "R Shin" },
                  { id: "b-head", label: "Head" }, { id: "b-neck", label: "Neck" },
                  { id: "l-trap", label: "L Trap" }, { id: "r-trap", label: "R Trap" },
                  { id: "l-shoulder-b", label: "L Shoulder" }, { id: "r-shoulder-b", label: "R Shoulder" },
                  { id: "upper-back", label: "Upper Back" }, { id: "l-lat", label: "L Lat" },
                  { id: "r-lat", label: "R Lat" }, { id: "lower-back", label: "Lower Back" },
                  { id: "l-glute", label: "L Glute" }, { id: "r-glute", label: "R Glute" },
                  { id: "l-hamstring", label: "L Hamstring" }, { id: "r-hamstring", label: "R Hamstring" },
                  { id: "l-knee-b", label: "L Knee" }, { id: "r-knee-b", label: "R Knee" },
                  { id: "l-calf", label: "L Calf" }, { id: "r-calf", label: "R Calf" },
                ]
                const zone = allZones.find(z => z.id === id)
                return (
                  <button
                    key={id}
                    onClick={() => setSorenessAreas(prev => prev.filter(s => s !== id))}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-opacity hover:opacity-70"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.25)",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "9px",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {zone?.label ?? id} ×
                  </button>
                )
              })}
            </div>
          )}
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
