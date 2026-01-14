'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  FormAnalysisResult,
  JointDeviation,
} from '@/lib/form-analysis/types'
import {
  getScoreColor,
  getScoreBgColor,
  getScoreMessage,
} from '@/lib/form-analysis'
import {
  getSeverityColor,
  getSeverityLabel,
} from '@/lib/form-analysis/feedback-generator'
import { JointDeviationChart } from './joint-deviation-chart'

interface ResultsDisplayProps {
  results: FormAnalysisResult
  onSave?: () => void
  onRetry?: () => void
  isSaving?: boolean
}

export function ResultsDisplay({
  results,
  onSave,
  onRetry,
  isSaving,
}: ResultsDisplayProps) {
  const [expandedJoints, setExpandedJoints] = useState<Set<string>>(new Set())

  const toggleJoint = (jointName: string) => {
    const newExpanded = new Set(expandedJoints)
    if (newExpanded.has(jointName)) {
      newExpanded.delete(jointName)
    } else {
      newExpanded.add(jointName)
    }
    setExpandedJoints(newExpanded)
  }

  const getSeverityIcon = (severity: JointDeviation['severity']) => {
    switch (severity) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'minor':
        return <Info className="h-4 w-4 text-yellow-500" />
      case 'moderate':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'major':
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className={`p-6 rounded-lg ${getScoreBgColor(results.overallScore)} border border-border/30`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall Score</p>
            <p className={`text-4xl font-bold ${getScoreColor(results.overallScore)}`}>
              {Math.round(results.overallScore)}
            </p>
            <p className="text-sm mt-1">{getScoreMessage(results.overallScore)}</p>
          </div>
          <div className="relative h-24 w-24">
            <svg className="transform -rotate-90 h-24 w-24">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-secondary"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(results.overallScore / 100) * 251.2} 251.2`}
                className={getScoreColor(results.overallScore)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${getScoreColor(results.overallScore)}`}>
                {Math.round(results.overallScore)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 text-center">
          <p className="text-xs text-muted-foreground">Consistency</p>
          <p className="text-2xl font-bold">{Math.round(results.consistencyScore)}%</p>
        </div>
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 text-center">
          <p className="text-xs text-muted-foreground">Avg Deviation</p>
          <p className="text-2xl font-bold">{results.avgDeviationDegrees.toFixed(1)}°</p>
        </div>
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 text-center">
          <p className="text-xs text-muted-foreground">Frames Analyzed</p>
          <p className="text-2xl font-bold">{results.totalFramesAnalyzed}</p>
        </div>
      </div>

      {/* Joint Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Joint Analysis</h3>
        {results.jointDeviations.map((deviation) => (
          <Collapsible
            key={deviation.jointName}
            open={expandedJoints.has(deviation.jointName)}
            onOpenChange={() => toggleJoint(deviation.jointName)}
          >
            <div className="rounded-lg bg-secondary/20 border border-border/30 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(deviation.severity)}
                    <div className="text-left">
                      <p className="font-medium">{deviation.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {getSeverityLabel(deviation.severity)} - {deviation.deviationAvg.toFixed(1)}° avg deviation
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold ${getSeverityColor(deviation.severity)}`}>
                        {Math.round(deviation.score)}
                      </p>
                    </div>
                    {expandedJoints.has(deviation.jointName) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4 border-t border-border/30">
                  {/* Angle Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded bg-secondary/30">
                      <p className="text-xs text-muted-foreground">Reference Angle</p>
                      <p className="text-lg font-semibold">{deviation.idealAngleAvg.toFixed(1)}°</p>
                    </div>
                    <div className="p-3 rounded bg-secondary/30">
                      <p className="text-xs text-muted-foreground">Your Angle</p>
                      <p className="text-lg font-semibold">{deviation.userAngleAvg.toFixed(1)}°</p>
                    </div>
                  </div>

                  {/* Deviation Range */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Deviation Range</span>
                      <span>
                        {deviation.deviationMin.toFixed(1)}° - {deviation.deviationMax.toFixed(1)}°
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (deviation.deviationAvg / 30) * 100)}
                      className="h-2"
                    />
                  </div>

                  {/* Chart */}
                  {deviation.frameDeviations.length > 0 && (
                    <JointDeviationChart
                      jointName={deviation.displayName}
                      frameDeviations={deviation.frameDeviations}
                    />
                  )}

                  {/* Feedback */}
                  {deviation.feedback && (
                    <div className="p-3 rounded bg-primary/5 border border-primary/20">
                      <p className="text-sm">{deviation.feedback}</p>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>

      {/* Key Frames */}
      {results.keyFrames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Key Frames to Review</h3>
          <div className="space-y-2">
            {results.keyFrames.map((frame, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-secondary/20 border border-border/30 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">Frame {frame.frameIndex}</p>
                  <p className="text-xs text-muted-foreground">{frame.description}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Max deviation: {Math.max(...Object.values(frame.deviations)).toFixed(1)}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(onSave || onRetry) && (
        <div className="flex gap-3 pt-4">
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="flex-1">
              Try Again
            </Button>
          )}
          {onSave && (
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 gradient-primary glow-primary"
            >
              {isSaving ? 'Saving...' : 'Save Analysis'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
