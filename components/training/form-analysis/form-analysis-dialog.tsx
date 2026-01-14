'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowLeft, ArrowRight, Video, Upload, Activity, BarChart3 } from 'lucide-react'
import { VideoUpload } from './video-upload'
import { PoseDetector } from './pose-detector'
import { ResultsDisplay } from './results-display'
import {
  PoseLandmarks,
  FormAnalysisResult,
  FormReferenceVideo,
} from '@/lib/form-analysis/types'
import { analyzeForm, getAvailableExerciseTypes } from '@/lib/form-analysis'

interface FormAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type Step = 'reference' | 'attempt' | 'processing' | 'results'

interface VideoData {
  url: string
  blobPath: string
  duration: number
}

export function FormAnalysisDialog({
  open,
  onOpenChange,
  onSuccess,
}: FormAnalysisDialogProps) {
  const [step, setStep] = useState<Step>('reference')
  const [exerciseType, setExerciseType] = useState('squat')
  const [referenceName, setReferenceName] = useState('')

  // Reference video state
  const [referenceMode, setReferenceMode] = useState<'upload' | 'existing'>('upload')
  const [existingReferences, setExistingReferences] = useState<FormReferenceVideo[]>([])
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null)
  const [referenceVideo, setReferenceVideo] = useState<VideoData | null>(null)
  const [referenceLandmarks, setReferenceLandmarks] = useState<PoseLandmarks[] | null>(null)

  // User attempt state
  const [attemptVideo, setAttemptVideo] = useState<VideoData | null>(null)
  const [attemptLandmarks, setAttemptLandmarks] = useState<PoseLandmarks[] | null>(null)

  // Processing state
  const [processingStep, setProcessingStep] = useState<'reference' | 'attempt' | 'analyzing'>('reference')
  const [analysisResult, setAnalysisResult] = useState<FormAnalysisResult | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [analysisId, setAnalysisId] = useState<string | null>(null)

  const exerciseTypes = getAvailableExerciseTypes()

  // Fetch existing references
  useEffect(() => {
    if (open && exerciseType) {
      fetchReferences()
    }
  }, [open, exerciseType])

  const fetchReferences = async () => {
    try {
      const res = await fetch(`/api/athletes/form-analysis/references?exercise_type=${exerciseType}`)
      if (res.ok) {
        const data = await res.json()
        setExistingReferences(data.references || [])
      }
    } catch (error) {
      console.error('Failed to fetch references:', error)
    }
  }

  const handleReferenceUploadComplete = (data: VideoData) => {
    setReferenceVideo(data)
  }

  const handleAttemptUploadComplete = (data: VideoData) => {
    setAttemptVideo(data)
  }

  const handleReferenceLandmarksComplete = (landmarks: PoseLandmarks[]) => {
    setReferenceLandmarks(landmarks)
    setProcessingStep('attempt')
  }

  const handleAttemptLandmarksComplete = (landmarks: PoseLandmarks[]) => {
    setAttemptLandmarks(landmarks)
    setProcessingStep('analyzing')

    // Run analysis
    if (referenceLandmarks) {
      const result = analyzeForm(referenceLandmarks, landmarks, exerciseType)
      setAnalysisResult(result)
      setStep('results')
    }
  }

  const handleProcessingError = (error: string) => {
    toast.error(error)
    setStep('attempt')
  }

  const startProcessing = async () => {
    if (!referenceVideo && !selectedReferenceId) {
      toast.error('Please select or upload a reference video')
      return
    }
    if (!attemptVideo) {
      toast.error('Please upload your video')
      return
    }

    // Create analysis record
    try {
      const res = await fetch('/api/athletes/form-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_video_id: selectedReferenceId,
          exercise_type: exerciseType,
          video_url: attemptVideo.url,
          video_blob_path: attemptVideo.blobPath,
          duration_ms: attemptVideo.duration,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setAnalysisId(data.analysis.id)
      }
    } catch (error) {
      console.error('Failed to create analysis:', error)
    }

    setStep('processing')
    setProcessingStep('reference')
  }

  const saveAnalysis = async () => {
    if (!analysisResult || !analysisId) return

    setIsSaving(true)
    try {
      // Save reference video if new
      if (referenceVideo && referenceMode === 'upload' && referenceName) {
        await fetch('/api/athletes/form-analysis/references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: referenceName,
            exercise_type: exerciseType,
            video_url: referenceVideo.url,
            video_blob_path: referenceVideo.blobPath,
            duration_ms: referenceVideo.duration,
          }),
        })
      }

      // Save analysis results
      const res = await fetch(`/api/athletes/form-analysis/${analysisId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_score: analysisResult.overallScore,
          consistency_score: analysisResult.consistencyScore,
          key_frames: analysisResult.keyFrames,
          total_frames_analyzed: analysisResult.totalFramesAnalyzed,
          avg_deviation_degrees: analysisResult.avgDeviationDegrees,
          max_deviation_degrees: analysisResult.maxDeviationDegrees,
          joint_deviations: analysisResult.jointDeviations,
        }),
      })

      if (res.ok) {
        toast.success('Analysis saved successfully')
        onSuccess?.()
        resetAndClose()
      } else {
        toast.error('Failed to save analysis')
      }
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save analysis')
    } finally {
      setIsSaving(false)
    }
  }

  const resetAndClose = () => {
    setStep('reference')
    setReferenceMode('upload')
    setReferenceVideo(null)
    setSelectedReferenceId(null)
    setReferenceLandmarks(null)
    setAttemptVideo(null)
    setAttemptLandmarks(null)
    setAnalysisResult(null)
    setAnalysisId(null)
    setReferenceName('')
    onOpenChange(false)
  }

  const canProceedFromReference = () => {
    if (referenceMode === 'existing') {
      return !!selectedReferenceId
    }
    return !!referenceVideo && !!referenceName
  }

  const canProceedFromAttempt = () => {
    return !!attemptVideo
  }

  // Get reference video URL for processing
  const getReferenceVideoUrl = () => {
    if (referenceMode === 'existing' && selectedReferenceId) {
      const ref = existingReferences.find((r) => r.id === selectedReferenceId)
      return ref?.video_url || ''
    }
    return referenceVideo?.url || ''
  }

  const getStepIndicator = () => {
    const steps = [
      { key: 'reference', label: 'Reference', icon: Video },
      { key: 'attempt', label: 'Your Video', icon: Upload },
      { key: 'processing', label: 'Analysis', icon: Activity },
      { key: 'results', label: 'Results', icon: BarChart3 },
    ]

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium
                ${step === s.key
                  ? 'bg-primary text-primary-foreground'
                  : steps.findIndex((x) => x.key === step) > index
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-secondary/50 text-muted-foreground'
                }
              `}
            >
              <s.icon className="h-4 w-4" />
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  steps.findIndex((x) => x.key === step) > index
                    ? 'bg-green-500/50'
                    : 'bg-secondary/50'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">
            Form Analysis
          </DialogTitle>
        </DialogHeader>

        {getStepIndicator()}

        {/* Step 1: Reference Video */}
        {step === 'reference' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exercise Type</Label>
              <Select value={exerciseType} onValueChange={setExerciseType}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exerciseTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reference Video (Ideal Form)</Label>
              <div className="flex gap-2 mb-3">
                <Button
                  type="button"
                  variant={referenceMode === 'upload' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReferenceMode('upload')}
                >
                  Upload New
                </Button>
                {existingReferences.length > 0 && (
                  <Button
                    type="button"
                    variant={referenceMode === 'existing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setReferenceMode('existing')}
                  >
                    Use Existing ({existingReferences.length})
                  </Button>
                )}
              </div>

              {referenceMode === 'upload' ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Reference name (e.g., 'Perfect Squat Form')"
                    value={referenceName}
                    onChange={(e) => setReferenceName(e.target.value)}
                    className="bg-secondary/50 border-border/50"
                  />
                  <VideoUpload
                    purpose="reference"
                    onUploadComplete={handleReferenceUploadComplete}
                  />
                </div>
              ) : (
                <Select
                  value={selectedReferenceId || ''}
                  onValueChange={setSelectedReferenceId}
                >
                  <SelectTrigger className="bg-secondary/50 border-border/50">
                    <SelectValue placeholder="Select a reference video" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingReferences.map((ref) => (
                      <SelectItem key={ref.id} value={ref.id}>
                        {ref.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={resetAndClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => setStep('attempt')}
                disabled={!canProceedFromReference()}
                className="flex-1 gradient-primary"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: User's Attempt Video */}
        {step === 'attempt' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your Video</Label>
              <p className="text-xs text-muted-foreground">
                Upload a video of yourself performing the {exerciseTypes.find((t) => t.id === exerciseType)?.name}
              </p>
              <VideoUpload
                purpose="attempt"
                onUploadComplete={handleAttemptUploadComplete}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('reference')} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={startProcessing}
                disabled={!canProceedFromAttempt()}
                className="flex-1 gradient-primary"
              >
                Analyze Form
                <Activity className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Analyzing Your Form</h3>
              <p className="text-sm text-muted-foreground">
                {processingStep === 'reference' && 'Processing reference video...'}
                {processingStep === 'attempt' && 'Processing your video...'}
                {processingStep === 'analyzing' && 'Comparing movements...'}
              </p>
            </div>

            {processingStep === 'reference' && (
              <PoseDetector
                videoUrl={getReferenceVideoUrl()}
                onComplete={handleReferenceLandmarksComplete}
                onError={handleProcessingError}
              />
            )}

            {processingStep === 'attempt' && attemptVideo && (
              <PoseDetector
                videoUrl={attemptVideo.url}
                onComplete={handleAttemptLandmarksComplete}
                onError={handleProcessingError}
              />
            )}

            {processingStep === 'analyzing' && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin" />
                <p className="text-sm text-muted-foreground mt-2">
                  Calculating joint angles and deviations...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && analysisResult && (
          <ResultsDisplay
            results={analysisResult}
            onSave={saveAnalysis}
            onRetry={() => {
              setStep('attempt')
              setAttemptVideo(null)
              setAttemptLandmarks(null)
              setAnalysisResult(null)
            }}
            isSaving={isSaving}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
