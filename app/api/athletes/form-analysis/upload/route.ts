import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Ensure Node.js runtime for fs access and larger body handling
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Try to import Vercel Blob, but don't fail if token isn't configured
let vercelBlobPut: typeof import('@vercel/blob').put | null = null
try {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    vercelBlobPut = require('@vercel/blob').put
  }
} catch {
  // Vercel Blob not available
}

export async function POST(request: Request) {
  let step = 'init'
  try {
    step = 'auth'
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    step = 'parse-formdata'
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const purpose = formData.get('purpose') as string | null // 'reference' or 'attempt'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type "${file.type}". Supported formats: MP4, WebM, MOV` },
        { status: 400 }
      )
    }

    // Validate file size
    const maxSize = process.env.BLOB_READ_WRITE_TOKEN ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${process.env.BLOB_READ_WRITE_TOKEN ? '100MB' : '10MB'}` },
        { status: 400 }
      )
    }

    // Generate unique pathname
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'mp4'
    const pathname = `form-analysis/${user.id}/${purpose || 'video'}/${timestamp}.${extension}`

    // Use Vercel Blob if available, otherwise use local storage
    if (vercelBlobPut && process.env.BLOB_READ_WRITE_TOKEN) {
      step = 'blob-upload'
      const blob = await vercelBlobPut(pathname, file, {
        access: 'public',
        contentType: file.type,
      })

      return NextResponse.json(
        {
          url: blob.url,
          pathname: blob.pathname,
          contentType: file.type,
          size: file.size,
        },
        { status: 201 }
      )
    }

    // Local storage fallback for development
    step = 'mkdir'
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'form-analysis', user.id, purpose || 'video')
    await mkdir(uploadsDir, { recursive: true })

    const filename = `${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Convert File to Buffer and write
    step = 'read-buffer'
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    step = 'write-file'
    await writeFile(filepath, buffer)

    // Return local URL
    const localUrl = `/uploads/form-analysis/${user.id}/${purpose || 'video'}/${filename}`

    return NextResponse.json(
      {
        url: localUrl,
        pathname: localUrl,
        contentType: file.type,
        size: file.size,
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Upload error at step "${step}":`, message, error)
    return NextResponse.json(
      { error: `Upload failed at ${step}: ${message}` },
      { status: 500 }
    )
  }
}
