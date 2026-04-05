"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Users, User, Check } from "lucide-react"
import { toast } from "sonner"

interface Athlete {
  id: string
  name: string
  email: string
  sport?: string
  team?: string
}

interface ScheduleMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  athletes: Athlete[]
  onSuccess: () => void
}

export function ScheduleMeetingDialog({ open, onOpenChange, athletes, onSuccess }: ScheduleMeetingDialogProps) {
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState(30)
  const [meetingType, setMeetingType] = useState<"individual" | "team">("individual")
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const filtered = athletes.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.sport ?? "").toLowerCase().includes(search.toLowerCase())
  )

  function toggleAthlete(id: string) {
    setSelectedAthletes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    if (meetingType === "team") {
      setSelectedAthletes(new Set(athletes.map((a) => a.id)))
    }
  }

  async function handleSubmit() {
    if (!date || !time) {
      toast.error("Please select a date and time")
      return
    }
    if (selectedAthletes.size === 0) {
      toast.error("Please select at least one athlete")
      return
    }

    setSaving(true)
    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString()
      const res = await fetch("/api/coach/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || (meetingType === "team" ? "Team Meeting" : "1:1 Meeting"),
          notes: notes.trim() || null,
          scheduledAt,
          durationMinutes: duration,
          meetingType,
          athleteIds: Array.from(selectedAthletes),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to schedule meeting")
      }
      toast.success(`Meeting scheduled with ${selectedAthletes.size} athlete${selectedAthletes.size !== 1 ? "s" : ""}`)
      onOpenChange(false)
      onSuccess()
      // Reset
      setTitle("")
      setNotes("")
      setDate("")
      setTime("")
      setDuration(30)
      setMeetingType("individual")
      setSelectedAthletes(new Set())
      setSearch("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">Schedule Meeting</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meeting type toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => { setMeetingType("individual"); setSelectedAthletes(new Set()) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                meetingType === "individual"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <User className="h-4 w-4" />
              1:1 Meeting
            </button>
            <button
              onClick={() => { setMeetingType("team"); setSelectedAthletes(new Set(athletes.map((a) => a.id))) }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                meetingType === "team"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Team Meeting
            </button>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={meetingType === "team" ? "Team Meeting" : "1:1 Meeting"}
              className="bg-secondary/50"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <div className="flex gap-2">
              {[15, 30, 45, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-1.5 rounded text-sm font-medium border transition-colors ${
                    duration === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>

          {/* Athlete selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                {meetingType === "team" ? "Invitees" : "Select Athlete"}
                <span className="text-muted-foreground ml-1.5">({selectedAthletes.size})</span>
              </Label>
              {meetingType === "team" && (
                <button onClick={selectAll} className="text-xs text-primary hover:underline">
                  Select all
                </button>
              )}
            </div>

            {/* Search */}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search athletes..."
              className="bg-secondary/50"
            />

            {/* Athlete list */}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">No athletes found</p>
              ) : (
                filtered.map((a) => {
                  const selected = selectedAthletes.has(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        if (meetingType === "individual") {
                          setSelectedAthletes(new Set([a.id]))
                        } else {
                          toggleAthlete(a.id)
                        }
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-secondary/30 transition-colors"
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <div>
                        <p className="text-sm font-medium">{a.name}</p>
                        {a.sport && <p className="text-xs text-muted-foreground">{a.sport}</p>}
                      </div>
                      <div
                        className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                          selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Meeting agenda, topics to discuss..."
              className="bg-secondary/50 min-h-[60px]"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={saving || !date || !time || selectedAthletes.size === 0}
            className="w-full gradient-primary"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Schedule Meeting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
