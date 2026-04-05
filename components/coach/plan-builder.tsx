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
  Wand2,
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
  ImagePlus,
  X,
  Monitor,
  Plane,
  Target,
  Type,
  Camera,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ParsedExercise {
  name: string
  details: string | null
  forGroups: string[] | null
}

interface ParsedSession {
  type: "practice" | "lift" | "conditioning" | "recovery" | "competition" | "optional" | "video" | "travel" | "meeting" | "skills"
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

const SESSION_COLORS: Record<string, string> = {
  practice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  lift: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  conditioning: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  recovery: "bg-green-500/20 text-green-400 border-green-500/30",
  competition: "bg-red-500/20 text-red-400 border-red-500/30",
  optional: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  video: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  travel: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  meeting: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  skills: "bg-teal-500/20 text-teal-400 border-teal-500/30",
}

const DEFAULT_SESSION_COLOR = "bg-slate-500/20 text-slate-400 border-slate-500/30"

const getSessionColor = (type: string) => SESSION_COLORS[type] || DEFAULT_SESSION_COLOR

const getSessionIcon = (type: string) => {
  switch (type) {
    case "lift":
      return <Dumbbell className="h-4 w-4" />
    case "recovery":
    case "optional":
      return <Coffee className="h-4 w-4" />
    case "competition":
      return <Calendar className="h-4 w-4" />
    case "video":
      return <Monitor className="h-4 w-4" />
    case "travel":
      return <Plane className="h-4 w-4" />
    case "meeting":
      return <Users className="h-4 w-4" />
    case "skills":
      return <Target className="h-4 w-4" />
    default:
      return <Dumbbell className="h-4 w-4" />
  }
}

export function PlanBuilder() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1) // 1=intensity, 2=workout input, 3=review, 4=publish
  const [inputMode, setInputMode] = useState<"text" | "image">("text")
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hideExercises, setHideExercises] = useState(false)
  const [dayIntensities, setDayIntensities] = useState<Record<string, string>>({
    monday: "n/a", tuesday: "n/a", wednesday: "n/a", thursday: "n/a",
    friday: "n/a", saturday: "n/a", sunday: "n/a",
  })

  // Fetch coach's groups
  const { data: groupsData } = useSWR<{ groups: Group[] }>("/api/coach/groups", fetcher)
  const groups = groupsData?.groups || []

  const groupsBySlug: Record<string, Group> = {}
  groups.forEach((g) => {
    groupsBySlug[g.slug] = g
  })

  const isExcelFile = (file: File) =>
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel' ||
    file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')

  const handleImageSelect = (file: File) => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validImageTypes.includes(file.type) && !isExcelFile(file)) {
      toast.error("Invalid file type. Use JPEG, PNG, WebP, Excel (.xlsx/.xls), or CSV.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum 10MB.")
      return
    }
    setImageFile(file)
    setImagePreview(isExcelFile(file) ? null : URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageSelect(file)
  }

  const handleParse = async () => {
    if (inputMode === "text" && !planText.trim()) {
      toast.error("Please paste your workout plan text")
      return
    }
    if (inputMode === "image" && !imageFile) {
      toast.error("Please upload an image of your workout plan")
      return
    }

    setIsParsing(true)
    setParseError(null)

    try {
      let res: Response

      if (inputMode === "image" && imageFile) {
        const formData = new FormData()
        formData.append("image", imageFile)
        if (planText.trim()) formData.append("text", planText)
        res = await fetch("/api/coach/plans/parse", {
          method: "POST",
          body: formData,
        })
      } else {
        res = await fetch("/api/coach/plans/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: planText }),
        })
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse plan")
      }

      // Ensure the plan has required structure with defaults
      const safePlan: ParsedPlan = {
        days: (data.plan?.days || []).map((day: ParsedDay) => ({
          dayOfWeek: day.dayOfWeek || "monday",
          isOffDay: day.isOffDay ?? false,
          sessions: (day.sessions || []).map((session: ParsedSession) => ({
            type: session.type || "practice",
            title: session.title || null,
            startTime: session.startTime || null,
            endTime: session.endTime || null,
            location: session.location || null,
            isOptional: session.isOptional ?? false,
            forGroups: session.forGroups || null,
            exercises: (session.exercises || []).map((ex: ParsedExercise) => ({
              name: ex.name || "Exercise",
              details: ex.details || null,
              forGroups: ex.forGroups || null,
            })),
          })),
        })),
        detectedGroups: data.plan?.detectedGroups || [],
        scheduleInfo: data.plan?.scheduleInfo || null,
      }
      setParsedPlan(safePlan)
      setStep(3)
      toast.success("Plan parsed successfully!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse plan"
      setParseError(message)
      toast.error(message)
    } finally {
      setIsParsing(false)
    }
  }

  const handleSaveIntensityOnly = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/coach/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName || `Week of ${weekStartDate}`,
          weekStartDate,
          hideExercises: true,
          dayIntensities,
          // Create a minimal parsed plan with one "practice" session per day that has intensity set
          parsedPlan: {
            days: Object.entries(dayIntensities)
              .filter(([, intensity]) => intensity !== "n/a")
              .map(([day, intensity]) => ({
                dayOfWeek: day,
                isOffDay: false,
                sessions: [{
                  type: "practice",
                  title: `${intensity.charAt(0).toUpperCase() + intensity.slice(1)} Intensity`,
                  startTime: null,
                  endTime: null,
                  location: null,
                  isOptional: false,
                  forGroups: null,
                  exercises: [],
                }],
              })),
            detectedGroups: [],
            scheduleInfo: null,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save plan")

      const planId = data.planId

      // Auto-publish
      const pubRes = await fetch(`/api/coach/plans/${planId}/publish`, { method: "POST" })
      const pubData = await pubRes.json()

      if (!pubRes.ok) throw new Error(pubData.error || "Failed to publish")

      toast.success("Intensity plan published!")
      router.push("/coach/plans")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setIsSaving(false)
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
          hideExercises: false,
          dayIntensities,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save plan")
      }

      setSavedPlanId(data.planId)
      setStep(4)
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
        <div>
          <h1
            className="flex items-center gap-2"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", letterSpacing: "1px", color: "var(--cream)" }}
          >
            <Calendar className="h-6 w-6" style={{ color: "var(--gold)" }} />
            Create Weekly Plan
          </h1>
          <p className="text-muted-foreground">
            Create and assign weekly workout plans
          </p>
        </div>
      </div>

      {/* Step 1: Intensity + Plan Info */}
      {step === 1 && (
        <div className="space-y-6">
          <GlassCard className="space-y-4">
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

            {/* Intensity grid — always shown */}
            <div className="space-y-3">
              <Label>Daily Intensity</Label>
              <div className="grid grid-cols-7 gap-2">
                {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => {
                  const intensity = dayIntensities[day] || "n/a"
                  const colors: Record<string, { bg: string; text: string; border: string }> = {
                    high: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40" },
                    medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" },
                    low: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/40" },
                    "n/a": { bg: "bg-secondary/50", text: "text-muted-foreground", border: "border-border" },
                  }

                  return (
                    <div key={day} className="text-center space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">
                        {day.slice(0, 3)}
                      </p>
                      <div className="space-y-1">
                        {(["high", "medium", "low", "n/a"] as const).map((level) => {
                          const isSelected = intensity === level
                          const lc = colors[level]
                          return (
                            <button
                              key={level}
                              onClick={() => setDayIntensities((prev) => ({ ...prev, [day]: level }))}
                              className={`w-full py-1 rounded text-[10px] font-medium border transition-colors ${
                                isSelected
                                  ? `${lc.bg} ${lc.text} ${lc.border}`
                                  : "bg-transparent text-muted-foreground/40 border-transparent hover:border-border"
                              }`}
                            >
                              {level === "n/a" ? "N/A" : level.charAt(0).toUpperCase() + level.slice(1)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSaveIntensityOnly}
                disabled={isSaving}
                className="flex-1 gradient-primary"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Publish Intensity Only
              </Button>
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="flex-1"
              >
                Add Workout Details
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Step 2: Workout Details (text/image/excel) */}
      {step === 2 && (
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Workout Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setInputMode("text")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    inputMode === "text"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Type className="h-4 w-4" />
                  Paste Text
                </button>
                <button
                  onClick={() => setInputMode("image")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                    inputMode === "image"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  Upload File
                </button>
              </div>
            </div>

            {/* Text Input Mode */}
            {inputMode === "text" && (
              <div className="space-y-2">
                <Label htmlFor="planText">Workout Plan Text</Label>
                <Textarea
                  id="planText"
                  placeholder={`Paste your workout plan here...

Example:
Monday:
Practice 4:45-5:45
- Warmup, SD 1, flat strides
- Group 1: 5x200m 84% 5m rest
- Group 2: 6x150m 90% 5m rest

Lift 6:30-7:30 (optional)
- Squat 3x5
- Bench 3x5

Tuesday: Off

Wednesday:
Practice 4:45-5:45
- Tempo run
- Skills session 3:00-4:00`}
                  value={planText}
                  onChange={(e) => setPlanText(e.target.value)}
                  className="bg-secondary/50 min-h-[300px] font-mono text-sm"
                />
              </div>
            )}

            {/* Image Upload Mode (only when not intensity-only) */}
            {inputMode === "image" && (
              <div className="space-y-2">
                <Label>Workout Plan File</Label>
                {!imageFile ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = "image/jpeg,image/png,image/gif,image/webp,.xlsx,.xls,.csv"
                      input.style.display = "none"
                      document.body.appendChild(input)
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (file) handleImageSelect(file)
                        document.body.removeChild(input)
                      }
                      input.click()
                    }}
                    className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-secondary/30"
                    }`}
                  >
                    <ImagePlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Images (JPEG, PNG, WebP) or Excel (.xlsx, .xls, .csv) up to 10MB
                    </p>
                  </div>
                ) : imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img
                      src={imagePreview}
                      alt="Workout plan preview"
                      className="w-full max-h-[400px] object-contain bg-black/5"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-3 p-4 rounded-lg border border-border bg-secondary/20">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <ClipboardPaste className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{imageFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(imageFile.size / 1024).toFixed(0)} KB — Excel spreadsheet
                      </p>
                    </div>
                    <button
                      onClick={clearImage}
                      className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}

                {/* Optional text context with image */}
                <div className="space-y-2 mt-3">
                  <Label htmlFor="planTextContext" className="text-xs text-muted-foreground">
                    Additional context (optional)
                  </Label>
                  <Textarea
                    id="planTextContext"
                    placeholder="Add any extra details not in the image (e.g., group assignments, location notes)..."
                    value={planText}
                    onChange={(e) => setPlanText(e.target.value)}
                    className="bg-secondary/50 min-h-[80px] font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {parseError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {parseError}
              </div>
            )}

            <Button
              onClick={handleParse}
              disabled={isParsing || (inputMode === "text" ? !planText.trim() : !imageFile)}
              className="w-full gradient-primary"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {inputMode === "image" ? "Processing file..." : "Processing plan..."}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Parse Plan
                </>
              )}
            </Button>
          </GlassCard>

          {/* Tips */}
          {(
            <GlassCard className="bg-primary/5 border-primary/20">
              <h3 className="font-semibold mb-2">Tips for best results:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {inputMode === "text" ? (
                  <>
                    <li>- Include day names (Monday, Tuesday, etc.)</li>
                    <li>- Label groups or positions (e.g., Attack, Defense, Group 1, Varsity)</li>
                    <li>- Mark optional sessions with "(optional)"</li>
                    <li>- Include times and locations when available</li>
                    <li>- Use "Off" to mark rest days</li>
                  </>
                ) : (
                  <>
                    <li>- Upload Excel files (.xlsx, .xls) or CSV directly</li>
                    <li>- Screenshots of spreadsheets, whiteboards, or printed plans also work</li>
                    <li>- Higher resolution images produce better results</li>
                    <li>- Add extra context in the text field if anything is unclear</li>
                  </>
                )}
              </ul>
            </GlassCard>
          )}
        </div>
      )}

      {/* Step 2: Review Parsed Plan */}
      {step === 3 && parsedPlan && (
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                <h2 className="text-lg font-semibold">Review Parsed Plan</h2>
              </div>
              <Button variant="ghost" onClick={() => setStep(2)}>
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
                        className={`p-3 rounded-lg border ${getSessionColor(session.type)}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSessionIcon(session.type)}
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
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
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
      {step === 4 && (
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
