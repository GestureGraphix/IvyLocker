import { FrameComparison, JointDeviation, ExerciseConfig } from './types'

/**
 * Scoring thresholds for angle deviations.
 * Based on biomechanical significance of angular differences.
 */
export const DEVIATION_THRESHOLDS = {
  excellent: { max: 5, score: 100 },
  good: { max: 10, score: 90 },
  minor: { max: 15, score: 75 },
  needsWork: { max: 25, score: 50 },
  major: { max: Infinity, score: 25 },
} as const

/**
 * Convert a deviation in degrees to a score (0-100).
 */
export function deviationToScore(deviationDegrees: number): number {
  const absDeviation = Math.abs(deviationDegrees)

  if (absDeviation <= DEVIATION_THRESHOLDS.excellent.max) {
    return DEVIATION_THRESHOLDS.excellent.score
  }
  if (absDeviation <= DEVIATION_THRESHOLDS.good.max) {
    // Linear interpolation between excellent and good
    const t = (absDeviation - DEVIATION_THRESHOLDS.excellent.max) /
      (DEVIATION_THRESHOLDS.good.max - DEVIATION_THRESHOLDS.excellent.max)
    return DEVIATION_THRESHOLDS.excellent.score -
      t * (DEVIATION_THRESHOLDS.excellent.score - DEVIATION_THRESHOLDS.good.score)
  }
  if (absDeviation <= DEVIATION_THRESHOLDS.minor.max) {
    const t = (absDeviation - DEVIATION_THRESHOLDS.good.max) /
      (DEVIATION_THRESHOLDS.minor.max - DEVIATION_THRESHOLDS.good.max)
    return DEVIATION_THRESHOLDS.good.score -
      t * (DEVIATION_THRESHOLDS.good.score - DEVIATION_THRESHOLDS.minor.score)
  }
  if (absDeviation <= DEVIATION_THRESHOLDS.needsWork.max) {
    const t = (absDeviation - DEVIATION_THRESHOLDS.minor.max) /
      (DEVIATION_THRESHOLDS.needsWork.max - DEVIATION_THRESHOLDS.minor.max)
    return DEVIATION_THRESHOLDS.minor.score -
      t * (DEVIATION_THRESHOLDS.minor.score - DEVIATION_THRESHOLDS.needsWork.score)
  }

  // Beyond 25 degrees - major issue
  // Gradually decrease from 50 to minimum of 0
  const excess = absDeviation - DEVIATION_THRESHOLDS.needsWork.max
  return Math.max(0, DEVIATION_THRESHOLDS.needsWork.score - excess)
}

/**
 * Determine severity level from deviation degrees.
 */
export function getSeverity(
  deviationDegrees: number
): 'good' | 'minor' | 'moderate' | 'major' {
  const absDeviation = Math.abs(deviationDegrees)

  if (absDeviation <= DEVIATION_THRESHOLDS.excellent.max) {
    return 'good'
  }
  if (absDeviation <= DEVIATION_THRESHOLDS.good.max) {
    return 'good'
  }
  if (absDeviation <= DEVIATION_THRESHOLDS.minor.max) {
    return 'minor'
  }
  if (absDeviation <= DEVIATION_THRESHOLDS.needsWork.max) {
    return 'moderate'
  }
  return 'major'
}

/**
 * Calculate standard deviation of an array of numbers.
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map((v) => (v - mean) ** 2)
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length

  return Math.sqrt(avgSquaredDiff)
}

/**
 * Calculate joint deviation statistics from frame comparisons.
 */
export function calculateJointDeviation(
  jointName: string,
  displayName: string,
  comparisons: FrameComparison[]
): Omit<JointDeviation, 'feedback'> {
  const frameDeviations: JointDeviation['frameDeviations'] = []
  const idealAngles: number[] = []
  const userAngles: number[] = []
  const deviations: number[] = []

  for (const comparison of comparisons) {
    const idealAngle = comparison.referenceAngles[jointName]
    const userAngle = comparison.userAngles[jointName]

    if (idealAngle !== undefined && userAngle !== undefined) {
      const deviation = Math.abs(userAngle - idealAngle)

      idealAngles.push(idealAngle)
      userAngles.push(userAngle)
      deviations.push(deviation)

      frameDeviations.push({
        frame: comparison.frameIndex,
        idealAngle,
        userAngle,
        deviation,
      })
    }
  }

  if (deviations.length === 0) {
    return {
      jointName,
      displayName,
      idealAngleAvg: 0,
      userAngleAvg: 0,
      deviationAvg: 0,
      deviationMax: 0,
      deviationMin: 0,
      deviationStd: 0,
      frameDeviations: [],
      score: 0,
      severity: 'major',
    }
  }

  const idealAngleAvg = idealAngles.reduce((a, b) => a + b, 0) / idealAngles.length
  const userAngleAvg = userAngles.reduce((a, b) => a + b, 0) / userAngles.length
  const deviationAvg = deviations.reduce((a, b) => a + b, 0) / deviations.length
  const deviationMax = Math.max(...deviations)
  const deviationMin = Math.min(...deviations)
  const deviationStd = standardDeviation(deviations)

  const score = deviationToScore(deviationAvg)
  const severity = getSeverity(deviationAvg)

  return {
    jointName,
    displayName,
    idealAngleAvg,
    userAngleAvg,
    deviationAvg,
    deviationMax,
    deviationMin,
    deviationStd,
    frameDeviations,
    score,
    severity,
  }
}

/**
 * Calculate the overall score from individual joint deviations.
 * Uses weighted average based on exercise configuration.
 */
export function calculateOverallScore(
  jointDeviations: JointDeviation[],
  exerciseConfig: ExerciseConfig
): number {
  let totalWeight = 0
  let weightedScore = 0

  for (const deviation of jointDeviations) {
    const weight = exerciseConfig.weights[deviation.jointName] ?? 0
    if (weight > 0) {
      weightedScore += deviation.score * weight
      totalWeight += weight
    }
  }

  if (totalWeight === 0) {
    // Fallback to simple average if no weights
    const avgScore = jointDeviations.reduce((sum, d) => sum + d.score, 0) / jointDeviations.length
    return avgScore
  }

  return weightedScore / totalWeight
}

/**
 * Calculate consistency score based on deviation variance.
 * High consistency = low variance in deviations across frames.
 * Score 0-100 where 100 is perfectly consistent.
 */
export function calculateConsistencyScore(jointDeviations: JointDeviation[]): number {
  const stdDevs = jointDeviations.map((d) => d.deviationStd)

  if (stdDevs.length === 0) return 0

  const avgStdDev = stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length

  // Map standard deviation to a score
  // 0 std dev = 100 (perfect consistency)
  // 10+ std dev = ~50 (poor consistency)
  // 20+ std dev = ~0 (very inconsistent)
  const score = Math.max(0, 100 - avgStdDev * 5)

  return Math.min(100, score)
}

/**
 * Compare frames between reference and user poses.
 */
export function compareFrames(
  referenceAngles: Record<string, number>,
  userAngles: Record<string, number>,
  frameIndex: number
): FrameComparison {
  const deviations: Record<string, number> = {}

  for (const jointName of Object.keys(referenceAngles)) {
    if (userAngles[jointName] !== undefined) {
      deviations[jointName] = Math.abs(userAngles[jointName] - referenceAngles[jointName])
    }
  }

  return {
    frameIndex,
    referenceAngles,
    userAngles,
    deviations,
  }
}

/**
 * Find key frames with significant deviations.
 */
export function findKeyFrames(
  comparisons: FrameComparison[],
  threshold: number = 15
): { frameIndex: number; description: string; deviations: Record<string, number> }[] {
  const keyFrames: { frameIndex: number; description: string; deviations: Record<string, number> }[] = []

  for (const comparison of comparisons) {
    const maxDeviation = Math.max(...Object.values(comparison.deviations))

    if (maxDeviation >= threshold) {
      const worstJoint = Object.entries(comparison.deviations)
        .reduce((max, [joint, dev]) => (dev > max.dev ? { joint, dev } : max), { joint: '', dev: 0 })

      keyFrames.push({
        frameIndex: comparison.frameIndex,
        description: `High deviation in ${worstJoint.joint} (${worstJoint.dev.toFixed(1)}°)`,
        deviations: comparison.deviations,
      })
    }
  }

  // Limit to most significant frames (max 5)
  return keyFrames
    .sort((a, b) => {
      const maxA = Math.max(...Object.values(a.deviations))
      const maxB = Math.max(...Object.values(b.deviations))
      return maxB - maxA
    })
    .slice(0, 5)
}
