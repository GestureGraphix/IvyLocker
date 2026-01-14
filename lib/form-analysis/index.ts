export * from './types'
export * from './exercise-configs'
export * from './joint-angles'
export * from './deviation-scorer'
export * from './feedback-generator'
export * from './frame-alignment'

import {
  PoseLandmarks,
  FormAnalysisResult,
  JointDeviation,
  FrameComparison,
} from './types'
import { getExerciseConfig } from './exercise-configs'
import { analyzeAllFrames } from './joint-angles'
import {
  calculateJointDeviation,
  calculateOverallScore,
  calculateConsistencyScore,
  compareFrames,
  findKeyFrames,
} from './deviation-scorer'
import { generateAllFeedback } from './feedback-generator'
import { alignFrames, getAlignedFramePairs } from './frame-alignment'

/**
 * Perform complete form analysis comparing user video to reference video.
 * This is the main entry point for the analysis pipeline.
 */
export function analyzeForm(
  referenceLandmarks: PoseLandmarks[],
  userLandmarks: PoseLandmarks[],
  exerciseType: string
): FormAnalysisResult {
  // Get exercise configuration
  const exerciseConfig = getExerciseConfig(exerciseType)

  // Align frames between reference and user videos
  const alignment = alignFrames(referenceLandmarks, userLandmarks, exerciseType)

  // Analyze all frames for both videos
  const referenceFrameAnalyses = analyzeAllFrames(referenceLandmarks, exerciseConfig.joints)
  const userFrameAnalyses = analyzeAllFrames(userLandmarks, exerciseConfig.joints)

  // Get aligned frame pairs
  const alignedPairs = getAlignedFramePairs(alignment, userLandmarks.length)

  // Compare frames
  const frameComparisons: FrameComparison[] = alignedPairs.map(({ referenceFrame, userFrame }) => {
    const refAnalysis = referenceFrameAnalyses[referenceFrame]
    const userAnalysis = userFrameAnalyses[userFrame]

    return compareFrames(
      refAnalysis?.jointAngles ?? {},
      userAnalysis?.jointAngles ?? {},
      userFrame
    )
  })

  // Calculate joint deviations
  const jointDeviationsRaw: Omit<JointDeviation, 'feedback'>[] = exerciseConfig.joints.map(
    (joint) =>
      calculateJointDeviation(joint.name, joint.displayName, frameComparisons)
  )

  // Generate feedback for each joint
  const jointDeviations = generateAllFeedback(
    jointDeviationsRaw as JointDeviation[],
    exerciseConfig
  )

  // Calculate overall scores
  const overallScore = calculateOverallScore(jointDeviations, exerciseConfig)
  const consistencyScore = calculateConsistencyScore(jointDeviations)

  // Find key frames with significant deviations
  const keyFrames = findKeyFrames(frameComparisons)

  // Calculate aggregate stats
  const allDeviations = jointDeviations.flatMap((j) =>
    j.frameDeviations.map((f) => f.deviation)
  )
  const avgDeviationDegrees =
    allDeviations.length > 0
      ? allDeviations.reduce((a, b) => a + b, 0) / allDeviations.length
      : 0
  const maxDeviationDegrees =
    allDeviations.length > 0 ? Math.max(...allDeviations) : 0

  return {
    overallScore,
    consistencyScore,
    totalFramesAnalyzed: userLandmarks.length,
    avgDeviationDegrees,
    maxDeviationDegrees,
    jointDeviations,
    keyFrames,
    referenceLandmarks,
    userLandmarks,
  }
}

/**
 * Quick score calculation without full analysis.
 * Useful for progress tracking or quick comparisons.
 */
export function quickScore(
  referenceLandmarks: PoseLandmarks[],
  userLandmarks: PoseLandmarks[],
  exerciseType: string
): { score: number; worstJoint: string | null } {
  const result = analyzeForm(referenceLandmarks, userLandmarks, exerciseType)

  const worstJoint = result.jointDeviations.reduce<JointDeviation | null>(
    (worst, current) =>
      !worst || current.deviationAvg > worst.deviationAvg ? current : worst,
    null
  )

  return {
    score: result.overallScore,
    worstJoint: worstJoint?.displayName ?? null,
  }
}

/**
 * Get analysis status message based on score.
 */
export function getScoreMessage(score: number): string {
  if (score >= 90) return 'Excellent form!'
  if (score >= 75) return 'Good form, minor adjustments needed'
  if (score >= 50) return 'Form needs improvement'
  return 'Significant form issues detected'
}

/**
 * Get color class for score (for UI).
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500'
  if (score >= 75) return 'text-yellow-500'
  if (score >= 50) return 'text-orange-500'
  return 'text-red-500'
}

/**
 * Get background color class for score (for UI).
 */
export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-500/10'
  if (score >= 75) return 'bg-yellow-500/10'
  if (score >= 50) return 'bg-orange-500/10'
  return 'bg-red-500/10'
}
