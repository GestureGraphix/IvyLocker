'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { useMediPipePose } from '@/hooks/use-mediapipe-pose'
import { PoseLandmarks } from '@/lib/form-analysis/types'

interface PoseDetectorProps {
  videoUrl: string
  onComplete: (landmarks: PoseLandmarks[]) => void
  onError: (error: string) => void
  autoStart?: boolean
}

type ProcessingStatus = 'idle' | 'initializing' | 'processing' | 'complete' | 'error'

export function PoseDetector({
  videoUrl,
  onComplete,
  onError,
  autoStart = true,
}: PoseDetectorProps) {
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { initialize, processVideo, isLoading, isInitialized, error } = useMediPipePose({
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  useEffect(() => {
    if (autoStart && videoUrl) {
      startProcessing()
    }
  }, [videoUrl, autoStart])

  useEffect(() => {
    if (error) {
      setStatus('error')
      setErrorMessage(error)
      onError(error)
    }
  }, [error, onError])

  const startProcessing = async () => {
    if (!videoUrl) return

    try {
      setStatus('initializing')
      setProgress(0)
      setErrorMessage(null)

      // Initialize MediaPipe if not already done
      if (!isInitialized) {
        await initialize()
      }

      setStatus('processing')

      // Process the video
      const landmarks = await processVideo(videoUrl, (p) => {
        setProgress(Math.round(p))
      })

      if (landmarks.length === 0) {
        throw new Error('No pose detected in video. Please ensure the person is visible.')
      }

      setStatus('complete')
      onComplete(landmarks)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process video'
      setStatus('error')
      setErrorMessage(message)
      onError(message)
    }
  }

  return (
    <div className="p-6 rounded-lg bg-secondary/20 border border-border/30">
      {status === 'idle' && (
        <div className="text-center text-muted-foreground">
          <p>Ready to analyze video</p>
        </div>
      )}

      {status === 'initializing' && (
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            Loading pose detection model...
          </p>
          <p className="text-xs text-muted-foreground">
            This may take a moment on first load
          </p>
        </div>
      )}

      {status === 'processing' && (
        <div className="space-y-4">
          <div className="text-center">
            <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
            <p className="text-sm text-muted-foreground mt-2">
              Analyzing video frames...
            </p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">
            {progress}% complete
          </p>
        </div>
      )}

      {status === 'complete' && (
        <div className="text-center space-y-2">
          <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
          <p className="text-sm font-medium text-green-500">
            Video analysis complete
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Analysis failed
          </p>
          {errorMessage && (
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  )
}
