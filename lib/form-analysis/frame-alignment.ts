import { PoseLandmarks, FrameAlignment, MovementPhase, LANDMARK_INDICES } from './types'

const L = LANDMARK_INDICES

/**
 * Detect movement phases in a video based on landmark positions.
 * For exercises like squats, detects descent, bottom, and ascent phases.
 */
export function detectMovementPhases(
  landmarks: PoseLandmarks[],
  exerciseType: string
): MovementPhase[] {
  const phases: MovementPhase[] = []

  // Get vertical position tracking based on exercise type
  const positions = getTrackingPositions(landmarks, exerciseType)

  if (positions.length === 0) {
    return phases
  }

  // Find local minima and maxima to detect phase boundaries
  const extrema = findExtrema(positions)

  // Convert extrema to phases
  for (let i = 0; i < extrema.length - 1; i++) {
    const current = extrema[i]
    const next = extrema[i + 1]

    const phaseName =
      current.type === 'max' && next.type === 'min'
        ? 'descent'
        : current.type === 'min' && next.type === 'max'
          ? 'ascent'
          : 'hold'

    phases.push({
      name: phaseName,
      referenceStart: current.index,
      referenceEnd: next.index,
      userStart: current.index, // Will be remapped during alignment
      userEnd: next.index,
    })
  }

  return phases
}

/**
 * Get the vertical position to track based on exercise type.
 * For squats/lunges: track hip position (lower = deeper)
 * For presses: track wrist/elbow position
 */
function getTrackingPositions(
  landmarks: PoseLandmarks[],
  exerciseType: string
): number[] {
  return landmarks.map((frame) => {
    const lms = frame.landmarks

    switch (exerciseType) {
      case 'squat':
      case 'deadlift':
      case 'lunge':
        // Track average hip Y position (higher Y = lower in frame = deeper squat)
        return (lms[L.LEFT_HIP].y + lms[L.RIGHT_HIP].y) / 2

      case 'bench_press':
      case 'overhead_press':
        // Track average wrist Y position
        return (lms[L.LEFT_WRIST].y + lms[L.RIGHT_WRIST].y) / 2

      case 'pushup':
        // Track shoulder Y position
        return (lms[L.LEFT_SHOULDER].y + lms[L.RIGHT_SHOULDER].y) / 2

      case 'row':
        // Track elbow Y position
        return (lms[L.LEFT_ELBOW].y + lms[L.RIGHT_ELBOW].y) / 2

      default:
        // Default to hip tracking
        return (lms[L.LEFT_HIP].y + lms[L.RIGHT_HIP].y) / 2
    }
  })
}

/**
 * Find local extrema (minima and maxima) in a sequence.
 * Uses smoothing to avoid noise-induced false extrema.
 */
function findExtrema(
  values: number[],
  windowSize: number = 5
): { index: number; value: number; type: 'min' | 'max' }[] {
  const extrema: { index: number; value: number; type: 'min' | 'max' }[] = []

  // Smooth the values first
  const smoothed = smoothArray(values, windowSize)

  // Find extrema with a minimum separation
  const minSeparation = Math.max(10, Math.floor(values.length / 10))

  for (let i = windowSize; i < smoothed.length - windowSize; i++) {
    const current = smoothed[i]
    const prev = smoothed[i - 1]
    const next = smoothed[i + 1]

    // Check if local maximum
    if (current > prev && current > next) {
      // Verify it's a significant peak
      const leftMin = Math.min(...smoothed.slice(Math.max(0, i - minSeparation), i))
      const rightMin = Math.min(...smoothed.slice(i + 1, Math.min(smoothed.length, i + minSeparation + 1)))
      const prominence = current - Math.max(leftMin, rightMin)

      if (prominence > 0.02) {
        // 2% of normalized range
        // Check separation from last extremum
        if (extrema.length === 0 || i - extrema[extrema.length - 1].index >= minSeparation) {
          extrema.push({ index: i, value: current, type: 'max' })
        }
      }
    }

    // Check if local minimum
    if (current < prev && current < next) {
      const leftMax = Math.max(...smoothed.slice(Math.max(0, i - minSeparation), i))
      const rightMax = Math.max(...smoothed.slice(i + 1, Math.min(smoothed.length, i + minSeparation + 1)))
      const prominence = Math.min(leftMax, rightMax) - current

      if (prominence > 0.02) {
        if (extrema.length === 0 || i - extrema[extrema.length - 1].index >= minSeparation) {
          extrema.push({ index: i, value: current, type: 'min' })
        }
      }
    }
  }

  return extrema
}

/**
 * Smooth an array using a simple moving average.
 */
function smoothArray(values: number[], windowSize: number): number[] {
  const result: number[] = []
  const halfWindow = Math.floor(windowSize / 2)

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow)
    const end = Math.min(values.length, i + halfWindow + 1)
    const window = values.slice(start, end)
    result.push(window.reduce((a, b) => a + b, 0) / window.length)
  }

  return result
}

/**
 * Align user video frames to reference video frames.
 * Uses phase detection and linear interpolation for alignment.
 */
export function alignFrames(
  referenceLandmarks: PoseLandmarks[],
  userLandmarks: PoseLandmarks[],
  exerciseType: string
): FrameAlignment {
  // Detect phases in both videos
  const refPhases = detectMovementPhases(referenceLandmarks, exerciseType)
  const userPhases = detectMovementPhases(userLandmarks, exerciseType)

  // If we can't detect phases, fall back to simple linear mapping
  if (refPhases.length === 0 || userPhases.length === 0) {
    return simpleLinearAlignment(referenceLandmarks.length, userLandmarks.length)
  }

  // Create frame mapping using phase boundaries
  const referenceFrameMap: number[] = new Array(userLandmarks.length)

  // Use the detected phases to create a piecewise linear mapping
  const numPhasePairs = Math.min(refPhases.length, userPhases.length)

  for (let i = 0; i < userLandmarks.length; i++) {
    // Find which user phase this frame belongs to
    let mappedFrame = i

    for (let p = 0; p < numPhasePairs; p++) {
      const refPhase = refPhases[p]
      const userPhase = userPhases[p]

      if (i >= userPhase.referenceStart && i <= userPhase.referenceEnd) {
        // Linear interpolation within this phase
        const userProgress =
          (i - userPhase.referenceStart) /
          (userPhase.referenceEnd - userPhase.referenceStart || 1)

        mappedFrame = Math.round(
          refPhase.referenceStart +
            userProgress * (refPhase.referenceEnd - refPhase.referenceStart)
        )
        break
      }
    }

    // Clamp to valid range
    referenceFrameMap[i] = Math.max(
      0,
      Math.min(referenceLandmarks.length - 1, mappedFrame)
    )
  }

  // Calculate alignment confidence based on phase matching
  const confidence = calculateAlignmentConfidence(refPhases, userPhases)

  // Update user phases with aligned frame indices
  const alignedPhases = userPhases.map((phase, i) => ({
    ...phase,
    userStart: phase.referenceStart,
    userEnd: phase.referenceEnd,
    referenceStart: refPhases[i]?.referenceStart ?? phase.referenceStart,
    referenceEnd: refPhases[i]?.referenceEnd ?? phase.referenceEnd,
  }))

  return {
    referenceFrameMap,
    confidence,
    phases: alignedPhases,
  }
}

/**
 * Simple linear alignment when phase detection fails.
 * Maps frames proportionally from user video to reference video.
 */
function simpleLinearAlignment(
  referenceLength: number,
  userLength: number
): FrameAlignment {
  const referenceFrameMap: number[] = []

  for (let i = 0; i < userLength; i++) {
    const progress = i / (userLength - 1 || 1)
    referenceFrameMap.push(Math.round(progress * (referenceLength - 1)))
  }

  return {
    referenceFrameMap,
    confidence: 0.5, // Medium confidence for simple linear mapping
    phases: [],
  }
}

/**
 * Calculate alignment confidence based on how well phases match.
 */
function calculateAlignmentConfidence(
  refPhases: MovementPhase[],
  userPhases: MovementPhase[]
): number {
  if (refPhases.length === 0 || userPhases.length === 0) {
    return 0.5
  }

  // Check if we have similar number of phases
  const phaseCountSimilarity =
    1 - Math.abs(refPhases.length - userPhases.length) / Math.max(refPhases.length, userPhases.length)

  // Check if phases have similar relative durations
  let durationSimilarity = 0
  const numPairs = Math.min(refPhases.length, userPhases.length)

  for (let i = 0; i < numPairs; i++) {
    const refDuration = refPhases[i].referenceEnd - refPhases[i].referenceStart
    const userDuration = userPhases[i].referenceEnd - userPhases[i].referenceStart

    if (refDuration > 0 && userDuration > 0) {
      const ratio = Math.min(refDuration, userDuration) / Math.max(refDuration, userDuration)
      durationSimilarity += ratio
    }
  }
  durationSimilarity /= numPairs || 1

  // Combine scores
  return phaseCountSimilarity * 0.4 + durationSimilarity * 0.6
}

/**
 * Get aligned frame pairs for comparison.
 * Returns pairs of (referenceFrameIndex, userFrameIndex) for comparison.
 */
export function getAlignedFramePairs(
  alignment: FrameAlignment,
  userLandmarksLength: number
): { referenceFrame: number; userFrame: number }[] {
  const pairs: { referenceFrame: number; userFrame: number }[] = []

  for (let i = 0; i < userLandmarksLength; i++) {
    pairs.push({
      referenceFrame: alignment.referenceFrameMap[i],
      userFrame: i,
    })
  }

  return pairs
}
