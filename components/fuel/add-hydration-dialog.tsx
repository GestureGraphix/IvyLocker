"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Droplets } from "lucide-react"
import { cn } from "@/lib/utils"

interface HydrationLog {
  id: string
  ounces: number
  source: string
  time: string
  date: string
}

interface AddHydrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newLog: HydrationLog) => void
}

const quickAmounts = [8, 12, 16, 20, 32]

// Get local date string in YYYY-MM-DD format (not UTC)
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function AddHydrationDialog({ open, onOpenChange, onSuccess }: AddHydrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [ounces, setOunces] = useState("")
  const [source, setSource] = useState("water")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ounces) return

    setIsLoading(true)

    try {
      const now = new Date()
      const newLogData = {
        ounces: Number.parseInt(ounces),
        source,
        date: getLocalDateString(now),
        time: now.toTimeString().slice(0, 5),
      }

      const response = await fetch("/api/athletes/hydration-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLogData),
      })

      const data = await response.json()
      const newLog = data.log || { id: Date.now().toString(), ...newLogData }

      onSuccess(newLog)
      onOpenChange(false)
      setOunces("")
      setSource("water")
    } catch (error) {
      console.error("Failed to log hydration:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="gradient-text">Log Hydration</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick amounts */}
          <div className="space-y-2">
            <Label>Quick Add</Label>
            <div className="flex gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setOunces(amount.toString())}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                    ounces === amount.toString()
                      ? "gradient-primary text-white glow-primary"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {amount}oz
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ounces">Custom Amount (oz)</Label>
            <Input
              id="ounces"
              type="number"
              min="1"
              placeholder="Enter ounces"
              value={ounces}
              onChange={(e) => setOunces(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="sports drink">Sports Drink</SelectItem>
                <SelectItem value="coffee">Coffee</SelectItem>
                <SelectItem value="tea">Tea</SelectItem>
                <SelectItem value="juice">Juice</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !ounces} className="flex-1 gradient-primary glow-primary">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Log Water"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
