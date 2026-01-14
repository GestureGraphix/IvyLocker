import { Landmark, JointConfig, FrameAnalysis, PoseLandmarks } from './types'

/**
 * Calculate the angle formed by three points where the vertex is the middle point.
 * Uses 3D coordinates for more accurate angle calculation.
 *
 * Formula:
 * Given points A, B (vertex), C:
 * Vector V1 = A - B
 * Vector V2 = C - B
 * Angle = arccos(V1 . V2 / (|V1| * |V2|)) * (180/PI)
 */
export function calculateAngle(
  point1: Landmark,
  vertex: Landmark,
  point2: Landmark
): number {
  // Vector from vertex to point1
  const v1 = {
    x: point1.x - vertex.x,
    y: point1.y - vertex.y,
    z: point1.z - vertex.z,
  }

  // Vector from vertex to point2
  const v2 = {
    x: point2.x - vertex.x,
    y: point2.y - vertex.y,
    z: point2.z - vertex.z,
  }

  // Dot product
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z

  // Magnitudes
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2)
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2)

  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) {
    return 0
  }

  // Calculate angle in radians, clamping to valid arccos range [-1, 1]
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
  const angleRad = Math.acos(cosAngle)

  // Convert to degrees
  return angleRad * (180 / Math.PI)
}

/**
 * Calculate the angle for a specific joint given landmarks and joint configuration.
 * Returns the angle and the average visibility of the three landmarks.
 */
export function calculateJointAngle(
  landmarks: Landmark[],
  jointConfig: JointConfig
): { angle: number; visibility: number } {
  const [idx1, idx2, idx3] = jointConfig.landmarkIndices

  // Validate indices
  if (idx1 >= landmarks.length || idx2 >= landmarks.length || idx3 >= landmarks.length) {
    return { angle: 0, visibility: 0 }
  }

  const point1 = landmarks[idx1]
  const vertex = landmarks[idx2]
  const point2 = landmarks[idx3]

  const angle = calculateAngle(point1, vertex, point2)

  // Average visibility of the three landmarks
  const visibility =
    ((point1.visibility ?? 1) + (vertex.visibility ?? 1) + (point2.visibility ?? 1)) / 3

  return { angle, visibility }
}

/**
 * Analyze a single frame and calculate all joint angles for the given exercise.
 */
export function analyzeFrame(
  poseLandmarks: PoseLandmarks,
  joints: JointConfig[],
  frameIndex: number
): FrameAnalysis {
  const jointAngles: Record<string, number> = {}
  const visibility: Record<string, number> = {}

  for (const joint of joints) {
    const result = calculateJointAngle(poseLandmarks.landmarks, joint)
    jointAngles[joint.name] = result.angle
    visibility[joint.name] = result.visibility
  }

  return {
    frameIndex,
    timestamp: poseLandmarks.timestamp,
    jointAngles,
    visibility,
  }
}

/**
 * Analyze all frames from a video's pose landmarks.
 */
export function analyzeAllFrames(
  poseLandmarksArray: PoseLandmarks[],
  joints: JointConfig[]
): FrameAnalysis[] {
  return poseLandmarksArray.map((poseLandmarks, index) =>
    analyzeFrame(poseLandmarks, joints, index)
  )
}

/**
 * Calculate the 2D angle (ignoring Z) for visualization purposes.
 * This can be useful when displaying angles on a 2D video overlay.
 */
export function calculate2DAngle(
  point1: Landmark,
  vertex: Landmark,
  point2: Landmark
): number {
  // Vector from vertex to point1
  const v1 = {
    x: point1.x - vertex.x,
    y: point1.y - vertex.y,
  }

  // Vector from vertex to point2
  const v2 = {
    x: point2.x - vertex.x,
    y: point2.y - vertex.y,
  }

  // Dot product
  const dot = v1.x * v2.x + v1.y * v2.y

  // Magnitudes
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2)
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2)

  if (mag1 === 0 || mag2 === 0) {
    return 0
  }

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)))
  const angleRad = Math.acos(cosAngle)

  return angleRad * (180 / Math.PI)
}

/**
 * Get the midpoint between two landmarks.
 * Useful for calculating spine angle using shoulder/hip midpoints.
 */
export function getMidpoint(landmark1: Landmark, landmark2: Landmark): Landmark {
  return {
    x: (landmark1.x + landmark2.x) / 2,
    y: (landmark1.y + landmark2.y) / 2,
    z: (landmark1.z + landmark2.z) / 2,
    visibility:
      ((landmark1.visibility ?? 1) + (landmark2.visibility ?? 1)) / 2,
  }
}

/**
 * Calculate the forward lean angle of the torso.
 * Measures the angle between vertical and the line from hip to shoulder.
 * Returns degrees from vertical (0 = perfectly upright, 90 = horizontal).
 */
export function calculateTorsoLean(
  shoulderMidpoint: Landmark,
  hipMidpoint: Landmark
): number {
  // Vector from hip to shoulder
  const torsoVector = {
    x: shoulderMidpoint.x - hipMidpoint.x,
    y: shoulderMidpoint.y - hipMidpoint.y,
  }

  // Vertical reference (pointing up, negative y in screen coordinates)
  const verticalVector = { x: 0, y: -1 }

  // Dot product
  const dot = torsoVector.x * verticalVector.x + torsoVector.y * verticalVector.y

  // Magnitudes
  const magTorso = Math.sqrt(torsoVector.x ** 2 + torsoVector.y ** 2)
  const magVertical = 1

  if (magTorso === 0) {
    return 0
  }

  const cosAngle = Math.max(-1, Math.min(1, dot / (magTorso * magVertical)))
  const angleRad = Math.acos(cosAngle)

  return angleRad * (180 / Math.PI)
}

/**
 * Check if the knee is tracking over the toe (valgus/varus detection).
 * Returns the lateral deviation: negative = valgus (knee inward), positive = varus (knee outward)
 */
export function calculateKneeTracking(
  hip: Landmark,
  knee: Landmark,
  ankle: Landmark
): number {
  // Ideal line from hip to ankle (in X dimension)
  const idealX = hip.x + ((ankle.x - hip.x) * (knee.y - hip.y)) / (ankle.y - hip.y)

  // Deviation of actual knee position from ideal
  return knee.x - idealX
}
