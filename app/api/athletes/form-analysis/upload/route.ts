import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Route segment config for handling large video uploads (100MB)
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
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        { error: 'Invalid file type. Supported formats: MP4, WebM, MOV' },
        { status: 400 }
      )
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB' },
        { status: 400 }
      )
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
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'form-analysis', user.id, purpose || 'video')
    await mkdir(uploadsDir, { recursive: true })

    const filename = `${timestamp}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Convert File to Buffer and write
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
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
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
