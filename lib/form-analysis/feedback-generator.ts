import { JointDeviation, ExerciseConfig } from './types'

interface FeedbackTemplate {
  condition: (deviation: JointDeviation, exerciseId: string) => boolean
  message: string
  recommendation: string
}

/**
 * Feedback templates for common form issues.
 * Each template has a condition function and corresponding feedback.
 */
const FEEDBACK_TEMPLATES: FeedbackTemplate[] = [
  // Knee issues
  {
    condition: (d, ex) =>
      (d.jointName === 'left_knee' || d.jointName === 'right_knee') &&
      ['squat', 'lunge'].includes(ex) &&
      d.userAngleAvg < d.idealAngleAvg - 10,
    message: 'Knee flexion is less than ideal - not reaching full depth',
    recommendation:
      'Work on hip and ankle mobility. Practice box squats at target depth to build muscle memory. Focus on "sitting back" into the movement.',
  },
  {
    condition: (d, ex) =>
      (d.jointName === 'left_knee' || d.jointName === 'right_knee') &&
      ['squat', 'lunge'].includes(ex) &&
      d.userAngleAvg > d.idealAngleAvg + 10,
    message: 'Excessive knee flexion - going too deep',
    recommendation:
      'Control the depth of your movement. Set a target depth marker or use a box to maintain consistent positioning.',
  },

  // Hip issues
  {
    condition: (d, ex) =>
      (d.jointName === 'left_hip' || d.jointName === 'right_hip') &&
      ['squat', 'deadlift'].includes(ex) &&
      d.userAngleAvg < d.idealAngleAvg - 10,
    message: 'Hip angle is too closed - excessive forward lean',
    recommendation:
      'Strengthen your core and upper back. Focus on keeping your chest up and pushing your hips back rather than down.',
  },
  {
    condition: (d, ex) =>
      (d.jointName === 'left_hip' || d.jointName === 'right_hip') &&
      ['deadlift'].includes(ex) &&
      d.userAngleAvg > d.idealAngleAvg + 10,
    message: 'Hips rising too fast - back rounding risk',
    recommendation:
      'Focus on pushing through the floor while keeping your chest up. Think "leg press" at the start of the lift.',
  },

  // Spine/back issues
  {
    condition: (d, ex) =>
      d.jointName === 'spine' &&
      ['squat', 'deadlift'].includes(ex) &&
      d.userAngleAvg < d.idealAngleAvg - 10,
    message: 'Excessive forward lean of the torso',
    recommendation:
      'Strengthen your core and upper back. Consider front squats or goblet squats to reinforce upright posture. Check ankle mobility.',
  },
  {
    condition: (d, ex) =>
      d.jointName === 'spine' &&
      ['deadlift', 'row'].includes(ex) &&
      d.deviationStd > 10,
    message: 'Inconsistent back position throughout the movement',
    recommendation:
      'Brace your core before each rep. Maintain a neutral spine throughout. Consider reducing weight to focus on form.',
  },
  {
    condition: (d) => d.jointName === 'body_line' && d.deviationAvg > 10,
    message: 'Body not maintaining straight line',
    recommendation:
      'Engage your core and glutes throughout the movement. Avoid sagging hips or piking. Practice plank holds to build core stability.',
  },

  // Elbow issues
  {
    condition: (d, ex) =>
      (d.jointName === 'left_elbow' || d.jointName === 'right_elbow') &&
      ex === 'bench_press' &&
      d.userAngleAvg < d.idealAngleAvg - 10,
    message: 'Elbows flaring too wide',
    recommendation:
      'Tuck your elbows at about 45-75 degrees from your torso. Think about "bending the bar" to engage your lats.',
  },
  {
    condition: (d, ex) =>
      (d.jointName === 'left_elbow' || d.jointName === 'right_elbow') &&
      ex === 'pushup' &&
      d.userAngleAvg > d.idealAngleAvg + 10,
    message: 'Not reaching full depth at bottom of push-up',
    recommendation:
      'Lower until your chest nearly touches the ground. Maintain control throughout the movement.',
  },

  // Shoulder issues
  {
    condition: (d, ex) =>
      (d.jointName === 'left_shoulder' || d.jointName === 'right_shoulder') &&
      ex === 'overhead_press' &&
      d.deviationAvg > 15,
    message: 'Shoulder path deviating from ideal overhead trajectory',
    recommendation:
      'Keep the bar close to your face as you press. Lock out directly over your mid-foot. Check shoulder mobility.',
  },
  {
    condition: (d, ex) =>
      (d.jointName === 'left_shoulder' || d.jointName === 'right_shoulder') &&
      ex === 'bench_press' &&
      d.userAngleAvg < d.idealAngleAvg - 10,
    message: 'Shoulders not in optimal position - may be internally rotated',
    recommendation:
      'Retract and depress your shoulder blades before unracking. Maintain this position throughout the lift.',
  },

  // General asymmetry detection
  {
    condition: (d) => {
      const isLeftSide = d.jointName.startsWith('left_')
      const rightName = d.jointName.replace('left_', 'right_')
      // This template triggers when we detect left-side issues
      // We'll check for asymmetry in the generateFeedback function
      return isLeftSide && d.deviationAvg > 10
    },
    message: 'Form deviation detected on left side',
    recommendation:
      'Check for muscle imbalances. Consider unilateral exercises to address asymmetry. Film yourself from multiple angles.',
  },

  // Consistency issues
  {
    condition: (d) => d.deviationStd > 15,
    message: 'Form breakdown during the set - inconsistent movement pattern',
    recommendation:
      'This may indicate fatigue or lack of motor control. Consider reducing weight or reps. Focus on quality over quantity.',
  },
]

/**
 * Default feedback based on severity level.
 */
const DEFAULT_FEEDBACK: Record<string, { message: string; recommendation: string }> = {
  good: {
    message: 'Joint position matches reference well',
    recommendation: 'Maintain your current technique. Consider progressing weight or reps.',
  },
  minor: {
    message: 'Slight deviation from ideal form',
    recommendation:
      'Minor adjustment needed. Focus on this joint during warm-up sets. The deviation is within acceptable range but could be improved.',
  },
  moderate: {
    message: 'Noticeable deviation from ideal form',
    recommendation:
      'Work on mobility and strength for this area. Consider reducing weight to focus on technique. Video review recommended.',
  },
  major: {
    message: 'Significant deviation from ideal form',
    recommendation:
      'This requires attention before progressing. Work with a coach or use lighter weight. Focus on mobility work and proper movement patterns.',
  },
}

/**
 * Generate specific feedback for a joint deviation.
 */
export function generateJointFeedback(
  deviation: JointDeviation,
  exerciseId: string
): { message: string; recommendation: string } {
  // Find the first matching template
  for (const template of FEEDBACK_TEMPLATES) {
    if (template.condition(deviation, exerciseId)) {
      return {
        message: template.message,
        recommendation: template.recommendation,
      }
    }
  }

  // Fall back to default feedback based on severity
  return DEFAULT_FEEDBACK[deviation.severity] || DEFAULT_FEEDBACK.moderate
}

/**
 * Generate feedback for all joint deviations.
 */
export function generateAllFeedback(
  jointDeviations: JointDeviation[],
  exerciseConfig: ExerciseConfig
): JointDeviation[] {
  return jointDeviations.map((deviation) => {
    const feedback = generateJointFeedback(deviation, exerciseConfig.id)
    return {
      ...deviation,
      feedback: `${feedback.message}. ${feedback.recommendation}`,
    }
  })
}

/**
 * Generate a summary of the overall analysis with key takeaways.
 */
export function generateSummary(
  overallScore: number,
  jointDeviations: JointDeviation[],
  exerciseConfig: ExerciseConfig
): string {
  const lines: string[] = []

  // Overall assessment
  if (overallScore >= 90) {
    lines.push('Excellent form overall! Your technique closely matches the reference.')
  } else if (overallScore >= 75) {
    lines.push('Good form with minor areas for improvement.')
  } else if (overallScore >= 50) {
    lines.push('Form needs some work. Focus on the highlighted areas.')
  } else {
    lines.push('Significant form improvements needed. Consider working with a coach.')
  }

  // Find worst joints
  const sortedDeviations = [...jointDeviations].sort(
    (a, b) => b.deviationAvg - a.deviationAvg
  )

  const problemJoints = sortedDeviations.filter((d) => d.severity === 'major' || d.severity === 'moderate')

  if (problemJoints.length > 0) {
    lines.push('')
    lines.push('Priority areas to address:')
    for (const joint of problemJoints.slice(0, 3)) {
      lines.push(`• ${joint.displayName}: ${joint.deviationAvg.toFixed(1)}° average deviation`)
    }
  }

  // Praise good areas
  const goodJoints = sortedDeviations.filter((d) => d.severity === 'good')
  if (goodJoints.length > 0) {
    lines.push('')
    lines.push('Strong points:')
    for (const joint of goodJoints.slice(0, 2)) {
      lines.push(`• ${joint.displayName}: Excellent positioning`)
    }
  }

  return lines.join('\n')
}

/**
 * Get color for severity level (for UI display).
 */
export function getSeverityColor(severity: JointDeviation['severity']): string {
  switch (severity) {
    case 'good':
      return 'text-green-500'
    case 'minor':
      return 'text-yellow-500'
    case 'moderate':
      return 'text-orange-500'
    case 'major':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

/**
 * Get label for severity level.
 */
export function getSeverityLabel(severity: JointDeviation['severity']): string {
  switch (severity) {
    case 'good':
      return 'Excellent'
    case 'minor':
      return 'Minor Issue'
    case 'moderate':
      return 'Needs Work'
    case 'major':
      return 'Major Issue'
    default:
      return 'Unknown'
  }
}
