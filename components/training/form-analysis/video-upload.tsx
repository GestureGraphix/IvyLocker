'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Upload, X, Video, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface VideoUploadProps {
  purpose: 'reference' | 'attempt'
  onUploadComplete: (data: {
    url: string
    blobPath: string
    duration: number
  }) => void
  onError?: (error: string) => void
  maxSizeMB?: number
}

export function VideoUpload({
  purpose,
  onUploadComplete,
  onError,
  maxSizeMB = 4, // Default 4MB for local dev (Next.js limit). Use Vercel Blob for larger files.
}: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']

  const validateFile = (file: File): string | null => {
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Supported formats: MP4, WebM, MOV'
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum size is ${maxSizeMB}MB`
    }
    return null
  }

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src)
        resolve(Math.round(video.duration * 1000)) // Convert to milliseconds
      }
      video.onerror = () => {
        resolve(0)
      }
      video.src = URL.createObjectURL(file)
    })
  }

  const uploadFile = async (file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      onError?.(error)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Get video duration
      const duration = await getVideoDuration(file)
      setUploadProgress(10)

      // Upload to server
      const formData = new FormData()
      formData.append('file', file)
      formData.append('purpose', purpose)

      setUploadProgress(50)

      const response = await fetch('/api/athletes/form-analysis/upload', {
        method: 'POST',
        body: formData,
      })

      setUploadProgress(90)

      // Handle non-JSON responses (usually means body too large)
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        throw new Error(
          file.size > 4 * 1024 * 1024
            ? 'File too large. Maximum 4MB for local development. Configure Vercel Blob for larger files.'
            : 'Server error. Please try again.'
        )
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadProgress(100)

      onUploadComplete({
        url: data.url,
        blobPath: data.pathname,
        duration,
      })

      toast.success('Video uploaded successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      toast.error(message)
      onError?.(message)
      setPreviewUrl(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      uploadFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  const clearVideo = () => {
    setPreviewUrl(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (previewUrl && !isUploading) {
    return (
      <div className="relative rounded-lg overflow-hidden bg-secondary/30 border border-border/50">
        <video
          ref={videoRef}
          src={previewUrl}
          controls
          className="w-full max-h-[300px] object-contain"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={clearVideo}
          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border'}
        ${isUploading ? 'pointer-events-none' : 'cursor-pointer'}
      `}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isUploading ? (
        <div className="space-y-4">
          <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Uploading video...</p>
            <Progress value={uploadProgress} className="h-2 max-w-[200px] mx-auto" />
            <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            {isDragging ? (
              <Upload className="h-10 w-10 text-primary" />
            ) : (
              <Video className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {isDragging ? 'Drop video here' : 'Drop video or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MP4, WebM, or MOV up to {maxSizeMB}MB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
