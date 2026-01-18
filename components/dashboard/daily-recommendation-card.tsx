"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, ChevronDown, ChevronUp, RefreshCw, Moon, Utensils, Activity, Droplets, BookOpen } from "lucide-react"
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
  const [isExpanded, setIsExpanded] = useState(false)
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
      const res = await fetch("/api/athletes/recommendations", {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setRecommendation(data.recommendation)
        if (!data.cached) {
          toast.success("Recommendation generated!")
        }
        setIsExpanded(true)
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

  if (isLoading) {
    return (
      <GlassCard>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </GlassCard>
    )
  }

  if (!recommendation) {
    return (
      <GlassCard glow="primary">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Today's Game Plan</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized daily recommendations
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full gradient-primary hover:opacity-90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Recommendations
              </>
            )}
          </Button>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard glow="success">
      <div className="space-y-3">
        {/* Header */}
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Sparkles className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Today's Game Plan</h3>
              {recommendation.priorityFocus && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {recommendation.priorityFocus}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleGenerate()
              }}
              disabled={isGenerating}
              className="h-8 w-8"
              title="Regenerate"
            >
              <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
            </Button>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-border/50">
            <RecommendationContent text={recommendation.text} />
            <p className="text-xs text-muted-foreground text-right">
              Generated {formatTime(recommendation.generatedAt)}
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

function RecommendationContent({ text }: { text: string }) {
  // Parse the markdown-style recommendation into sections
  const sections = parseRecommendation(text)

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center gap-2">
            {getSectionIcon(section.title)}
            <span className="text-sm font-medium text-foreground">{section.title}</span>
          </div>
          <div className="pl-6 text-sm text-muted-foreground whitespace-pre-line">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  )
}

interface Section {
  title: string
  content: string
}

function parseRecommendation(text: string): Section[] {
  const sections: Section[] = []
  const lines = text.split("\n")
  let currentSection: Section | null = null

  for (const line of lines) {
    // Match **Title**: content or **Title**\ncontent
    const headerMatch = line.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/)

    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: headerMatch[1].trim(),
        content: headerMatch[2].trim(),
      }
    } else if (currentSection && line.trim()) {
      // Append to current section content
      currentSection.content += (currentSection.content ? "\n" : "") + line.trim()
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

function getSectionIcon(title: string) {
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes("sleep")) {
    return <Moon className="h-4 w-4 text-indigo-400" />
  }
  if (lowerTitle.includes("nutrition") || lowerTitle.includes("meal")) {
    return <Utensils className="h-4 w-4 text-orange-400" />
  }
  if (lowerTitle.includes("recovery")) {
    return <Activity className="h-4 w-4 text-green-400" />
  }
  if (lowerTitle.includes("hydration")) {
    return <Droplets className="h-4 w-4 text-blue-400" />
  }
  if (lowerTitle.includes("student") || lowerTitle.includes("academic")) {
    return <BookOpen className="h-4 w-4 text-purple-400" />
  }
  if (lowerTitle.includes("priority") || lowerTitle.includes("focus")) {
    return <Sparkles className="h-4 w-4 text-yellow-400" />
  }

  return <Sparkles className="h-4 w-4 text-primary" />
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
