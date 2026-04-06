"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, ChevronDown, Moon, Utensils, Activity, Droplets, BookOpen, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

interface Recommendation {
  id: string
  text: string
  priorityFocus: string | null
  generatedAt: string
}

export function DailyRecommendationCard() {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecommendation()
  }, [])

  async function fetchRecommendation() {
    try {
      const res = await fetch("/api/athletes/recommendations")
      if (res.ok) {
        const data = await res.json()
        setRecommendation(data.recommendation)
      } else {
        setError("Failed to load recommendation")
      }
    } catch (err) {
      console.error("Failed to fetch recommendation:", err)
      setError("Failed to load recommendation")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const res = await fetch("/api/athletes/recommendations", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setRecommendation(data.recommendation)
        if (!data.cached) toast.success("Recommendation generated!")
        setIsCollapsed(false)
      } else {
        const data = await res.json()
        setError(data.error || "Failed to generate recommendation")
        toast.error(data.error || "Failed to generate recommendation")
      }
    } catch (err) {
      console.error("Failed to generate recommendation:", err)
      setError("Failed to generate recommendation")
      toast.error("Failed to generate recommendation")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div
      className="bg-white overflow-hidden"
      style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[18px] py-3 cursor-pointer select-none"
        style={{ borderBottom: isCollapsed ? "none" : "1px solid var(--rule)" }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
          <span
            className="uppercase"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "var(--muted)" }}
          >
            {recommendation?.priorityFocus || "Today's Game Plan"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {recommendation && (
            <button
              onClick={(e) => { e.stopPropagation(); handleGenerate() }}
              disabled={isGenerating}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Regenerate"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
            </button>
          )}
          <button
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
            tabIndex={-1}
          >
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform duration-200"
              style={{ transform: isCollapsed ? "rotate(-90deg)" : "none" }}
            />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--soft)" }} />
          </div>
        ) : !recommendation ? (
          <div className="px-[18px] py-5 space-y-3">
            <p className="text-[13px] italic" style={{ color: "var(--soft)", lineHeight: 1.65 }}>
              Get a personalized daily recommendation based on your training, nutrition, and wellness data.
            </p>
            {error && (
              <p className="text-[12px]" style={{ color: "var(--red, #b83232)" }}>{error}</p>
            )}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              variant="outline"
              size="sm"
            >
              {isGenerating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating...</>
              ) : (
                <><ClipboardList className="h-3.5 w-3.5" />Generate Recommendations</>
              )}
            </Button>
          </div>
        ) : (
          <ParchmentCard>
            <RecommendationContent text={recommendation.text} />
            <p
              className="text-right mt-3"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}
            >
              Generated {formatTime(recommendation.generatedAt)}
            </p>
          </ParchmentCard>
        )
      )}
    </div>
  )
}

function ParchmentCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-[18px] my-[14px]"
      style={{
        background: "var(--parchment)",
        border: "1px solid var(--cream-dd)",
        borderRadius: "2px",
        padding: "14px 18px 14px 42px",
        boxShadow: "inset -1px 0 0 rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Red margin line */}
      <div
        className="absolute top-0 bottom-0"
        style={{ left: "32px", width: "1px", background: "rgba(184,50,50,0.2)" }}
      />
      {/* Hole-punch dots */}
      <div
        className="absolute rounded-full"
        style={{
          left: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "8px",
          height: "8px",
          background: "var(--cream-d)",
          boxShadow: "0 -22px 0 var(--cream-d), 0 22px 0 var(--cream-d)",
        }}
      />
      {children}
    </div>
  )
}

function RecommendationContent({ text }: { text: string }) {
  const sections = parseRecommendation(text)
  return (
    <div className="space-y-2.5">
      {sections.map((section, index) => (
        <div key={index}>
          <div className="flex items-center gap-1.5 mb-0.5">
            {getSectionIcon(section.title)}
            <span
              className="font-medium"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--soft)" }}
            >
              {section.title}
            </span>
          </div>
          <p
            className="pl-5 text-[13px] italic"
            style={{ color: "var(--ink)", lineHeight: 1.65 }}
          >
            {section.content}
          </p>
        </div>
      ))}
    </div>
  )
}

interface Section { title: string; content: string }

function parseRecommendation(text: string): Section[] {
  const sections: Section[] = []
  const lines = text.split("\n")
  let currentSection: Section | null = null
  for (const line of lines) {
    const headerMatch = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/)
    if (headerMatch) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: headerMatch[1].trim(), content: headerMatch[2].trim() }
    } else if (currentSection && line.trim()) {
      currentSection.content += (currentSection.content ? "\n" : "") + line.trim()
    }
  }
  if (currentSection) sections.push(currentSection)
  return sections
}

function getSectionIcon(title: string) {
  const t = title.toLowerCase()
  const style = { width: "12px", height: "12px", opacity: 0.6 }
  if (t.includes("sleep")) return <Moon style={{ ...style, color: "#6366f1" }} />
  if (t.includes("nutrition") || t.includes("meal")) return <Utensils style={{ ...style, color: "var(--gold)" }} />
  if (t.includes("recovery")) return <Activity style={{ ...style, color: "var(--ivy-mid)" }} />
  if (t.includes("hydration")) return <Droplets style={{ ...style, color: "#2563eb" }} />
  if (t.includes("student") || t.includes("academic")) return <BookOpen style={{ ...style, color: "var(--ivy)" }} />
  return <ClipboardList style={{ ...style, color: "var(--gold)" }} />
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000)
  const diffHours = Math.floor(diffMins / 60)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
