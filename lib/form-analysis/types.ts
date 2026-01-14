// MediaPipe landmark structure
export interface Landmark {
  x: number // 0-1 normalized
  y: number // 0-1 normalized
  z: number // Depth, roughly same scale as x
  visibility?: number // 0-1 confidence
}

// Full pose with all 33 MediaPipe landmarks
export interface PoseLandmarks {
  landmarks: Landmark[]
  worldLandmarks?: Landmark[] // 3D with real-world scale in meters
  timestamp: number
}

// Joint configuration for angle calculation
export interface JointConfig {
  name: string
  displayName: string
  // Indices of the three landmarks that form the angle (vertex is middle)
  landmarkIndices: [number, number, number]
}

// Exercise type configuration
export interface ExerciseConfig {
  id: string
  name: string
  joints: JointConfig[]
  weights: Record<string, number> // Joint name -> weight (0-1, should sum to 1)
  idealRanges?: Record<string, { min: number; max: number }> // Expected angle ranges
}

// Single frame analysis
export interface FrameAnalysis {
  frameIndex: number
  timestamp: number
  jointAngles: Record<string, number> // Joint name -> angle in degrees
  visibility: Record<string, number> // Joint name -> visibility confidence
}

// Comparison between reference and user for a single frame
export interface FrameComparison {
  frameIndex: number
  referenceAngles: Record<string, number>
  userAngles: Record<string, number>
  deviations: Record<string, number> // Absolute difference in degrees
}

// Overall deviation stats for a joint
export interface JointDeviation {
  jointName: string
  displayName: string
  idealAngleAvg: number
  userAngleAvg: number
  deviationAvg: number
  deviationMax: number
  deviationMin: number
  deviationStd: number
  frameDeviations: { frame: number; idealAngle: number; userAngle: number; deviation: number }[]
  score: number // 0-100
  severity: 'good' | 'minor' | 'moderate' | 'major'
  feedback: string
}

// Complete analysis result
export interface FormAnalysisResult {
  overallScore: number // 0-100
  consistencyScore: number // 0-100 (lower variance = higher score)
  totalFramesAnalyzed: number
  avgDeviationDegrees: number
  maxDeviationDegrees: number
  jointDeviations: JointDeviation[]
  keyFrames: {
    frameIndex: number
    description: string // e.g., "Bottom of squat", "Top of movement"
    deviations: Record<string, number>
  }[]
  referenceLandmarks: PoseLandmarks[]
  userLandmarks: PoseLandmarks[]
}

// Frame alignment result
export interface FrameAlignment {
  referenceFrameMap: number[] // Index = user frame, value = matched reference frame
  confidence: number
  phases: MovementPhase[]
}

export interface MovementPhase {
  name: string // e.g., "descent", "bottom", "ascent"
  referenceStart: number
  referenceEnd: number
  userStart: number
  userEnd: number
}

// Database types (matching SQL schema)
export interface FormReferenceVideo {
  id: string
  user_id: string
  name: string
  exercise_type: string
  video_url: string
  video_blob_path: string
  duration_ms: number | null
  frame_rate: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FormAnalysis {
  id: string
  user_id: string
  reference_video_id: string | null
  exercise_type: string
  video_url: string
  video_blob_path: string
  duration_ms: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface FormAnalysisResultDB {
  id: string
  analysis_id: string
  overall_score: number
  consistency_score: number | null
  key_frames: object
  total_frames_analyzed: number | null
  avg_deviation_degrees: number | null
  max_deviation_degrees: number | null
  reference_landmarks: object | null
  user_landmarks: object | null
  created_at: string
}

export interface FormJointDeviationDB {
  id: string
  result_id: string
  joint_name: string
  ideal_angle_avg: number
  user_angle_avg: number
  deviation_avg: number
  deviation_max: number | null
  deviation_min: number | null
  frame_deviations: object | null
  feedback: string | null
  severity: 'good' | 'minor' | 'moderate' | 'major' | null
  created_at: string
}

// MediaPipe landmark indices for reference
export const LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const
