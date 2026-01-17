'use server'

import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Try to import Vercel Blob, but don't fail if token isn't configured
let vercelBlobPut: typeof import('@vercel/blob').put | null = null
try {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    vercelBlobPut = require('@vercel/blob').put
  }
} catch {
  // Vercel Blob not available
}

interface UploadResult {
  success: true
  url: string
  pathname: string
  contentType: string
  size: number
}

interface UploadError {
  success: false
  error: string
}

export async function uploadVideo(
  formData: FormData
): Promise<UploadResult | UploadError> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const file = formData.get('file') as File | null
    const purpose = formData.get('purpose') as string | null

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
    if (!validTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Supported formats: MP4, WebM, MOV',
      }
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File too large. Maximum size is 100MB' }
    }

    // Generate unique pathname
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'mp4'
    const pathname = `form-analysis/${user.id}/${purpose || 'video'}/${timestamp}.${extension}`

    // Use Vercel Blob if available, otherwise use local storage
    if (vercelBlobPut && process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await vercelBlobPut(pathname, file, {
        access: 'public',
        contentType: file.type,
      })

      return {
        success: true,
        url: blob.url,
        pathname: blob.pathname,
        contentType: file.type,
        size: file.size,
      }
    }

    // Local storage fallback for development
    const uploadsDir = join(
      process.cwd(),
      'public',
      'uploads',
      'form-analysis',
      user.id,
      purpose || 'video'
    )
    await mkdir(uploadsDir, { recursive: true })

    const filename = `${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Convert File to Buffer and write
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return local URL
    const localUrl = `/uploads/form-analysis/${user.id}/${purpose || 'video'}/${filename}`

    return {
      success: true,
      url: localUrl,
      pathname: localUrl,
      contentType: file.type,
      size: file.size,
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Failed to upload file' }
  }
}
