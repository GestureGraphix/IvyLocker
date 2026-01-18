"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Calendar,
  ClipboardPaste,
  Check,
  Loader2,
  AlertCircle,
  Dumbbell,
  Coffee,
  Clock,
  MapPin,
  Users,
  Send,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ParsedExercise {
  name: string
  details: string | null
  forGroups: string[] | null
}

interface ParsedSession {
  type: "practice" | "lift" | "conditioning" | "recovery" | "competition" | "optional"
  title: string | null
  startTime: string | null
  endTime: string | null
  location: string | null
  isOptional: boolean
  forGroups: string[] | null
  exercises: ParsedExercise[]
}

interface ParsedDay {
  dayOfWeek: string
  isOffDay: boolean
  sessions: ParsedSession[]
}

interface ParsedPlan {
  days: ParsedDay[]
  detectedGroups: string[]
  scheduleInfo: {
    practiceTime?: string
    liftTime?: string
    location?: string
  } | null
}

interface Group {
  id: string
  name: string
  slug: string
  color: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const DAY_NAMES: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
}

const SESSION_ICONS: Record<string, React.ReactNode> = {
  practice: <Dumbbell className="h-4 w-4" />,
  lift: <Dumbbell className="h-4 w-4" />,
  conditioning: <Dumbbell className="h-4 w-4" />,
  recovery: <Coffee className="h-4 w-4" />,
  competition: <Dumbbell className="h-4 w-4" />,
  optional: <Coffee className="h-4 w-4" />,
}

const SESSION_COLORS: Record<string, string> = {
  practice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lift: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  conditioning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  recovery: "bg-green-500/20 text-green-400 border-green-500/30",
  competition: "bg-red-500/20 text-red-400 border-red-500/30",
  optional: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export function PlanBuilder() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [planText, setPlanText] = useState("")
  const [planName, setPlanName] = useState("")
  const [weekStartDate, setWeekStartDate] = useState(() => {
    // Default to next Monday
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    return nextMonday.toISOString().split("T")[0]
  })
  const [isParsing, setIsParsing] = useState(false)
  const [parsedPlan, setParsedPlan] = useState<ParsedPlan | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  // Fetch coach's groups
  const { data: groupsData } = useSWR<{ groups: Group[] }>("/api/coach/groups", fetcher)
  const groups = groupsData?.groups || []

  const groupsBySlug: Record<string, Group> = {}
  groups.forEach((g) => {
    groupsBySlug[g.slug] = g
  })

  const handleParse = async () => {
    if (!planText.trim()) {
      toast.error("Please paste your workout plan text")
      return
    }

    setIsParsing(true)
    setParseError(null)

    try {
      const res = await fetch("/api/coach/plans/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: planText }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse plan")
      }

      setParsedPlan(data.plan)
      setStep(2)
      toast.success("Plan parsed successfully!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse plan"
      setParseError(message)
      toast.error(message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleSave = async () => {
    if (!parsedPlan) return

    setIsSaving(true)

    try {
      const res = await fetch("/api/coach/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName || `Week of ${weekStartDate}`,
          weekStartDate,
          sourceText: planText,
          parsedPlan,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save plan")
      }

      setSavedPlanId(data.planId)
      setStep(3)
      toast.success("Plan saved as draft!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save plan"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!savedPlanId) return

    setIsPublishing(true)

    try {
      const res = await fetch(`/api/coach/plans/${savedPlanId}/publish`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to publish plan")
      }

      toast.success(data.message || "Plan published!")
      router.push("/coach/plans")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish plan"
      toast.error(message)
    } finally {
      setIsPublishing(false)
    }
  }

  const getGroupBadge = (slug: string) => {
    const group = groupsBySlug[slug]
    if (group) {
      return (
        <Badge
          key={slug}
          variant="outline"
          style={{ borderColor: group.color, color: group.color }}
        >
          {group.name}
        </Badge>
      )
    }
    return (
      <Badge key={slug} variant="outline" className="text-yellow-500 border-yellow-500">
        {slug} (not found)
      </Badge>
    )
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/coach" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" />
            Create Weekly Plan
          </h1>
          <p className="text-muted-foreground">
            Paste your workout plan and let AI structure it
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 h-1 mx-1 ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Paste Plan */}
      {step === 1 && (
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Paste Your Workout Plan</h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planName">Plan Name (optional)</Label>
              <Input
                id="planName"
                placeholder="e.g., Week 5 - Speed Development"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekStartDate">Week Start Date</Label>
              <Input
                id="weekStartDate"
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="bg-secondary/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planText">Workout Plan Text</Label>
              <Textarea
                id="planText"
                placeholder={`Paste your workout plan here...

Example:
Monday:
Practice 4:45-5:45
- Warmup, SD 1, flat strides
- LS: 5x200m 84% 5m rest
- SS: 6x150m 90% 5m rest

Lift 6:30-7:30 (optional)
- Squat 3x5
- Bench 3x5

Tuesday: Off

Wednesday:
Practice 4:45-5:45
- Tempo run
- Hurdles: 3x5 hurdle drill`}
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                className="bg-secondary/50 min-h-[300px] font-mono text-sm"
              />
            </div>

            {parseError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {parseError}
              </div>
            )}

            <Button
              onClick={handleParse}
              disabled={isParsing || !planText.trim()}
              className="w-full gradient-primary"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse Plan with AI
                </>
              )}
            </Button>
          </GlassCard>

          {/* Tips */}
          <GlassCard className="bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2">Tips for best results:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Include day names (Monday, Tuesday, etc.)</li>
              <li>- Use "LS:", "SS:", "Hurdles:" to specify groups</li>
              <li>- Mark optional sessions with "(optional)"</li>
              <li>- Include times like "4:45-5:45" or "6:30pm"</li>
              <li>- Use "Off" to mark rest days</li>
            </ul>
          </GlassCard>
        </div>
      )}

      {/* Step 2: Review Parsed Plan */}
      {step === 2 && parsedPlan && (
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                <h2 className="text-lg font-semibold">Review Parsed Plan</h2>
              </div>
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Edit
              </Button>
            </div>

            {/* Detected Groups */}
            {parsedPlan.detectedGroups.length > 0 && (
              <div className="p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Detected Groups:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parsedPlan.detectedGroups.map((slug) => getGroupBadge(slug))}
                </div>
              </div>
            )}

            {/* Schedule Info */}
            {parsedPlan.scheduleInfo && (
              <div className="p-3 bg-secondary/30 rounded-lg flex flex-wrap gap-4 text-sm">
                {parsedPlan.scheduleInfo.practiceTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Practice: {parsedPlan.scheduleInfo.practiceTime}
                  </div>
                )}
                {parsedPlan.scheduleInfo.liftTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Lift: {parsedPlan.scheduleInfo.liftTime}
                  </div>
                )}
                {parsedPlan.scheduleInfo.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {parsedPlan.scheduleInfo.location}
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Days */}
          <div className="space-y-4">
            {parsedPlan.days.map((day, dayIdx) => (
              <GlassCard key={dayIdx}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">
                    {DAY_NAMES[day.dayOfWeek] || day.dayOfWeek}
                  </h3>
                  {day.isOffDay && (
                    <Badge variant="secondary">
                      <Coffee className="h-3 w-3 mr-1" />
                      Off Day
                    </Badge>
                  )}
                </div>

                {!day.isOffDay && day.sessions.length > 0 && (
                  <div className="space-y-3">
                    {day.sessions.map((session, sessionIdx) => (
                      <div
                        key={sessionIdx}
                        className={`p-3 rounded-lg border ${SESSION_COLORS[session.type]}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {SESSION_ICONS[session.type]}
                            <span className="font-medium capitalize">
                              {session.title || session.type}
                            </span>
                            {session.isOptional && (
                              <Badge variant="outline" className="text-xs">
                                Optional
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {session.startTime && (
                              <span>
                                {session.startTime}
                                {session.endTime && ` - ${session.endTime}`}
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

                        {session.forGroups && session.forGroups.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {session.forGroups.map((slug) => getGroupBadge(slug))}
                          </div>
                        )}

                        {session.exercises.length > 0 && (
                          <ul className="space-y-1 text-sm">
                            {session.exercises.map((exercise, exIdx) => (
                              <li key={exIdx} className="flex items-start gap-2">
                                <span className="text-muted-foreground">-</span>
                                <div className="flex-1">
                                  <span className="font-medium">{exercise.name}</span>
                                  {exercise.details && (
                                    <span className="text-muted-foreground ml-1">
                                      ({exercise.details})
                                    </span>
                                  )}
                                  {exercise.forGroups && exercise.forGroups.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {exercise.forGroups.map((slug) => getGroupBadge(slug))}
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

                {!day.isOffDay && day.sessions.length === 0 && (
                  <p className="text-muted-foreground text-sm">No sessions</p>
                )}
              </GlassCard>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Edit Text
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 gradient-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Publish */}
      {step === 3 && (
        <div className="space-y-6">
          <GlassCard className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Plan Saved!</h2>
            <p className="text-muted-foreground mb-6">
              Your plan has been saved as a draft. You can publish it now to assign
              workouts to your athletes, or do it later.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/coach/plans")}>
                View All Plans
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                className="gradient-primary"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Publish to Athletes
                  </>
                )}
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2">What happens when you publish?</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- Workouts are assigned to athletes based on their groups</li>
              <li>- Athletes can see their workouts in their dashboard</li>
              <li>- Athletes can mark workouts as completed</li>
              <li>- You can track completion rates</li>
            </ul>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
