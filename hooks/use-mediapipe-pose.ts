'use client'

import { useRef, useCallback, useState } from 'react'
import { PoseLandmarks, Landmark } from '@/lib/form-analysis/types'

interface UseMediPipePoseOptions {
  modelComplexity?: 0 | 1 | 2 // 0=lite, 1=full, 2=heavy
  smoothLandmarks?: boolean
  minDetectionConfidence?: number
  minTrackingConfidence?: number
}

interface PoseLandmarkerInstance {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => {
    landmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>
    worldLandmarks: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>
  }
  close: () => void
}

export function useMediPipePose(options: UseMediPipePoseOptions = {}) {
  const poseLandmarkerRef = useRef<PoseLandmarkerInstance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialize = useCallback(async () => {
    if (poseLandmarkerRef.current || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Dynamically import MediaPipe tasks-vision
      const vision = await import('@mediapipe/tasks-vision')
      const { PoseLandmarker, FilesetResolver } = vision

      // Initialize the FilesetResolver for WASM files
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )

      // Create pose landmarker
      const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: options.minDetectionConfidence ?? 0.5,
        minPosePresenceConfidence: options.minDetectionConfidence ?? 0.5,
        minTrackingConfidence: options.minTrackingConfidence ?? 0.5,
        outputSegmentationMasks: false,
      })

      poseLandmarkerRef.current = poseLandmarker as unknown as PoseLandmarkerInstance
      setIsInitialized(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize MediaPipe'
      setError(message)
      console.error('MediaPipe initialization error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [options.minDetectionConfidence, options.minTrackingConfidence, isLoading])

  const processFrame = useCallback(
    async (
      video: HTMLVideoElement,
      timestamp: number
    ): Promise<PoseLandmarks | null> => {
      if (!poseLandmarkerRef.current) {
        return null
      }

      try {
        const result = poseLandmarkerRef.current.detectForVideo(video, timestamp)

        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks: Landmark[] = result.landmarks[0].map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility ?? 1,
          }))

          const worldLandmarks: Landmark[] | undefined = result.worldLandmarks?.[0]?.map(
            (lm) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z,
              visibility: lm.visibility ?? 1,
            })
          )

          return {
            landmarks,
            worldLandmarks,
            timestamp,
          }
        }

        return null
      } catch (err) {
        console.error('Error processing frame:', err)
        return null
      }
    },
    []
  )

  const processVideo = useCallback(
    async (
      videoUrl: string,
      onProgress?: (progress: number) => void
    ): Promise<PoseLandmarks[]> => {
      if (!poseLandmarkerRef.current) {
        await initialize()
      }

      if (!poseLandmarkerRef.current) {
        throw new Error('Failed to initialize pose detector')
      }

      const results: PoseLandmarks[] = []

      // Create hidden video element
      const video = document.createElement('video')
      video.src = videoUrl
      video.muted = true
      video.playsInline = true
      video.crossOrigin = 'anonymous'

      // Wait for video metadata
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Failed to load video'))
      })

      // Calculate frame extraction parameters
      const fps = 30 // Target frame rate for analysis
      const duration = video.duration
      const totalFrames = Math.floor(duration * fps)
      const frameInterval = 1 / fps

      // Process video frame by frame
      for (let i = 0; i < totalFrames; i++) {
        const currentTime = i * frameInterval
        video.currentTime = currentTime

        // Wait for seek to complete
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve()
        })

        // Small delay to ensure frame is ready
        await new Promise((resolve) => setTimeout(resolve, 10))

        const timestamp = currentTime * 1000 // Convert to milliseconds
        const result = await processFrame(video, timestamp)

        if (result) {
          results.push(result)
        }

        // Report progress
        if (onProgress) {
          onProgress(((i + 1) / totalFrames) * 100)
        }
      }

      // Clean up
      video.remove()

      return results
    },
    [initialize, processFrame]
  )

  const processVideoElement = useCallback(
    async (
      video: HTMLVideoElement,
      onProgress?: (progress: number) => void
    ): Promise<PoseLandmarks[]> => {
      if (!poseLandmarkerRef.current) {
        await initialize()
      }

      if (!poseLandmarkerRef.current) {
        throw new Error('Failed to initialize pose detector')
      }

      const results: PoseLandmarks[] = []

      const fps = 30
      const duration = video.duration
      const totalFrames = Math.floor(duration * fps)
      const frameInterval = 1 / fps

      const originalTime = video.currentTime

      for (let i = 0; i < totalFrames; i++) {
        const currentTime = i * frameInterval
        video.currentTime = currentTime

        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve()
        })

        await new Promise((resolve) => setTimeout(resolve, 10))

        const timestamp = currentTime * 1000
        const result = await processFrame(video, timestamp)

        if (result) {
          results.push(result)
        }

        if (onProgress) {
          onProgress(((i + 1) / totalFrames) * 100)
        }
      }

      // Restore original time
      video.currentTime = originalTime

      return results
    },
    [initialize, processFrame]
  )

  const cleanup = useCallback(() => {
    if (poseLandmarkerRef.current) {
      poseLandmarkerRef.current.close()
      poseLandmarkerRef.current = null
      setIsInitialized(false)
    }
  }, [])

  return {
    initialize,
    processFrame,
    processVideo,
    processVideoElement,
    cleanup,
    isLoading,
    isInitialized,
    error,
  }
}
