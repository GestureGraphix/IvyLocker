"use client"

import { useState } from "react"
import { Loader2, Check, Flame } from "lucide-react"
import { toast } from "sonner"

export function LogCoreCard() {
  const [duration, setDuration] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [logged, setLogged] = useState(false)

  async function handleLog() {
    if (!duration) return
    setSaving(true)
    try {
      const now = new Date()
      const startAt = now.toISOString()
      const endAt = new Date(now.getTime() + duration * 60000).toISOString()

      const res = await fetch("/api/athletes/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Core – ${duration}min`,
          type: "strength",
          start_at: startAt,
          end_at: endAt,
          intensity: duration >= 20 ? "high" : duration >= 10 ? "medium" : "low",
          focus: "core",
          notes: null,
          scheduled_date: new Date().toISOString().split("T")[0],
        }),
      })
      if (!res.ok) throw new Error()

      // Mark as completed immediately
      const data = await res.json()
      if (data.session?.id) {
        await fetch(`/api/athletes/sessions/${data.session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        })
      }

      toast.success(`Core workout logged – ${duration} minutes`)
      setLogged(true)
      setTimeout(() => { setLogged(false); setDuration(null) }, 3000)
    } catch {
      toast.error("Failed to log core workout")
    } finally {
      setSaving(false)
    }
  }

  const durations = [5, 10, 15, 20, 30]

  return (
    <div
      className="bg-white overflow-hidden"
      style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
    >
      <div
        className="flex items-center gap-2 px-[18px] py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <Flame className="h-3.5 w-3.5" style={{ color: "#f97316" }} />
        <span
          className="uppercase"
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "var(--muted)" }}
        >
          Quick Core
        </span>
      </div>

      <div className="px-[18px] py-3">
        {logged ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium" style={{ color: "#16a34a" }}>
            <Check className="h-4 w-4" />
            Logged!
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex gap-1.5">
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(duration === d ? null : d)}
                  className="flex-1 py-1.5 rounded text-xs font-medium border transition-colors"
                  style={{
                    background: duration === d ? "#f97316" : "transparent",
                    color: duration === d ? "#fff" : "var(--muted-foreground)",
                    borderColor: duration === d ? "#f97316" : "var(--border)",
                  }}
                >
                  {d}m
                </button>
              ))}
            </div>
            <button
              onClick={handleLog}
              disabled={!duration || saving}
              className="w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40"
              style={{
                background: duration ? "#f97316" : "var(--border)",
                color: duration ? "#fff" : "var(--muted-foreground)",
              }}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                `Log Core${duration ? ` – ${duration}min` : ""}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
