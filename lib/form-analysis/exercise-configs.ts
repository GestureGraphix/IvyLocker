import { ExerciseConfig, LANDMARK_INDICES } from './types'

const L = LANDMARK_INDICES

export const EXERCISE_CONFIGS: Record<string, ExerciseConfig> = {
  squat: {
    id: 'squat',
    name: 'Squat',
    joints: [
      {
        name: 'left_knee',
        displayName: 'Left Knee',
        landmarkIndices: [L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE],
      },
      {
        name: 'right_knee',
        displayName: 'Right Knee',
        landmarkIndices: [L.RIGHT_HIP, L.RIGHT_KNEE, L.RIGHT_ANKLE],
      },
      {
        name: 'left_hip',
        displayName: 'Left Hip',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
      {
        name: 'right_hip',
        displayName: 'Right Hip',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_HIP, L.RIGHT_KNEE],
      },
      {
        name: 'spine',
        displayName: 'Spine/Torso',
        // Using shoulder-hip-knee to measure torso angle
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
    ],
    weights: {
      left_knee: 0.2,
      right_knee: 0.2,
      left_hip: 0.15,
      right_hip: 0.15,
      spine: 0.3,
    },
    idealRanges: {
      left_knee: { min: 70, max: 110 }, // At bottom of squat
      right_knee: { min: 70, max: 110 },
      left_hip: { min: 70, max: 120 },
      right_hip: { min: 70, max: 120 },
      spine: { min: 60, max: 90 },
    },
  },

  deadlift: {
    id: 'deadlift',
    name: 'Deadlift',
    joints: [
      {
        name: 'left_knee',
        displayName: 'Left Knee',
        landmarkIndices: [L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE],
      },
      {
        name: 'right_knee',
        displayName: 'Right Knee',
        landmarkIndices: [L.RIGHT_HIP, L.RIGHT_KNEE, L.RIGHT_ANKLE],
      },
      {
        name: 'left_hip',
        displayName: 'Left Hip',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
      {
        name: 'right_hip',
        displayName: 'Right Hip',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_HIP, L.RIGHT_KNEE],
      },
      {
        name: 'spine',
        displayName: 'Spine/Back',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
    ],
    weights: {
      left_knee: 0.1,
      right_knee: 0.1,
      left_hip: 0.2,
      right_hip: 0.2,
      spine: 0.4,
    },
    idealRanges: {
      left_knee: { min: 120, max: 170 },
      right_knee: { min: 120, max: 170 },
      left_hip: { min: 45, max: 90 },
      right_hip: { min: 45, max: 90 },
      spine: { min: 45, max: 90 },
    },
  },

  bench_press: {
    id: 'bench_press',
    name: 'Bench Press',
    joints: [
      {
        name: 'left_elbow',
        displayName: 'Left Elbow',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
      },
      {
        name: 'right_elbow',
        displayName: 'Right Elbow',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_ELBOW, L.RIGHT_WRIST],
      },
      {
        name: 'left_shoulder',
        displayName: 'Left Shoulder',
        landmarkIndices: [L.LEFT_HIP, L.LEFT_SHOULDER, L.LEFT_ELBOW],
      },
      {
        name: 'right_shoulder',
        displayName: 'Right Shoulder',
        landmarkIndices: [L.RIGHT_HIP, L.RIGHT_SHOULDER, L.RIGHT_ELBOW],
      },
    ],
    weights: {
      left_elbow: 0.3,
      right_elbow: 0.3,
      left_shoulder: 0.2,
      right_shoulder: 0.2,
    },
    idealRanges: {
      left_elbow: { min: 70, max: 100 },
      right_elbow: { min: 70, max: 100 },
      left_shoulder: { min: 45, max: 75 },
      right_shoulder: { min: 45, max: 75 },
    },
  },

  overhead_press: {
    id: 'overhead_press',
    name: 'Overhead Press',
    joints: [
      {
        name: 'left_elbow',
        displayName: 'Left Elbow',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
      },
      {
        name: 'right_elbow',
        displayName: 'Right Elbow',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_ELBOW, L.RIGHT_WRIST],
      },
      {
        name: 'left_shoulder',
        displayName: 'Left Shoulder',
        landmarkIndices: [L.LEFT_HIP, L.LEFT_SHOULDER, L.LEFT_ELBOW],
      },
      {
        name: 'right_shoulder',
        displayName: 'Right Shoulder',
        landmarkIndices: [L.RIGHT_HIP, L.RIGHT_SHOULDER, L.RIGHT_ELBOW],
      },
      {
        name: 'spine',
        displayName: 'Spine',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
    ],
    weights: {
      left_elbow: 0.2,
      right_elbow: 0.2,
      left_shoulder: 0.2,
      right_shoulder: 0.2,
      spine: 0.2,
    },
  },

  lunge: {
    id: 'lunge',
    name: 'Lunge',
    joints: [
      {
        name: 'left_knee',
        displayName: 'Left Knee',
        landmarkIndices: [L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE],
      },
      {
        name: 'right_knee',
        displayName: 'Right Knee',
        landmarkIndices: [L.RIGHT_HIP, L.RIGHT_KNEE, L.RIGHT_ANKLE],
      },
      {
        name: 'left_hip',
        displayName: 'Left Hip',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
      {
        name: 'right_hip',
        displayName: 'Right Hip',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_HIP, L.RIGHT_KNEE],
      },
    ],
    weights: {
      left_knee: 0.3,
      right_knee: 0.3,
      left_hip: 0.2,
      right_hip: 0.2,
    },
    idealRanges: {
      left_knee: { min: 85, max: 100 },
      right_knee: { min: 85, max: 100 },
      left_hip: { min: 80, max: 110 },
      right_hip: { min: 80, max: 110 },
    },
  },

  pushup: {
    id: 'pushup',
    name: 'Push-up',
    joints: [
      {
        name: 'left_elbow',
        displayName: 'Left Elbow',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
      },
      {
        name: 'right_elbow',
        displayName: 'Right Elbow',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_ELBOW, L.RIGHT_WRIST],
      },
      {
        name: 'body_line',
        displayName: 'Body Line',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_ANKLE],
      },
    ],
    weights: {
      left_elbow: 0.35,
      right_elbow: 0.35,
      body_line: 0.3,
    },
    idealRanges: {
      left_elbow: { min: 80, max: 100 },
      right_elbow: { min: 80, max: 100 },
      body_line: { min: 160, max: 180 }, // Should be nearly straight
    },
  },

  row: {
    id: 'row',
    name: 'Bent-Over Row',
    joints: [
      {
        name: 'left_elbow',
        displayName: 'Left Elbow',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
      },
      {
        name: 'right_elbow',
        displayName: 'Right Elbow',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_ELBOW, L.RIGHT_WRIST],
      },
      {
        name: 'spine',
        displayName: 'Back Angle',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
    ],
    weights: {
      left_elbow: 0.3,
      right_elbow: 0.3,
      spine: 0.4,
    },
    idealRanges: {
      left_elbow: { min: 30, max: 90 },
      right_elbow: { min: 30, max: 90 },
      spine: { min: 45, max: 75 },
    },
  },

  generic: {
    id: 'generic',
    name: 'Generic Exercise',
    joints: [
      {
        name: 'left_knee',
        displayName: 'Left Knee',
        landmarkIndices: [L.LEFT_HIP, L.LEFT_KNEE, L.LEFT_ANKLE],
      },
      {
        name: 'right_knee',
        displayName: 'Right Knee',
        landmarkIndices: [L.RIGHT_HIP, L.RIGHT_KNEE, L.RIGHT_ANKLE],
      },
      {
        name: 'left_hip',
        displayName: 'Left Hip',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_HIP, L.LEFT_KNEE],
      },
      {
        name: 'right_hip',
        displayName: 'Right Hip',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_HIP, L.RIGHT_KNEE],
      },
      {
        name: 'left_elbow',
        displayName: 'Left Elbow',
        landmarkIndices: [L.LEFT_SHOULDER, L.LEFT_ELBOW, L.LEFT_WRIST],
      },
      {
        name: 'right_elbow',
        displayName: 'Right Elbow',
        landmarkIndices: [L.RIGHT_SHOULDER, L.RIGHT_ELBOW, L.RIGHT_WRIST],
      },
    ],
    weights: {
      left_knee: 0.167,
      right_knee: 0.167,
      left_hip: 0.167,
      right_hip: 0.167,
      left_elbow: 0.166,
      right_elbow: 0.166,
    },
  },
}

export function getExerciseConfig(exerciseType: string): ExerciseConfig {
  return EXERCISE_CONFIGS[exerciseType] || EXERCISE_CONFIGS.generic
}

export function getAvailableExerciseTypes(): { id: string; name: string }[] {
  return Object.values(EXERCISE_CONFIGS).map((config) => ({
    id: config.id,
    name: config.name,
  }))
}
