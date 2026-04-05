import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { parseWorkoutPlan } from '@/lib/ai/parse-workout-plan'
import type { ParseInput } from '@/lib/ai/parse-workout-plan'
import * as XLSX from 'xlsx'

// POST /api/coach/plans/parse - Parse workout text or image with AI
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'COACH') {
      return NextResponse.json({ error: 'Only coaches can parse plans' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    let input: ParseInput = {}

    if (contentType.includes('multipart/form-data')) {
      // File upload path (image or Excel)
      const formData = await request.formData()
      const file = formData.get('image') as File | null // "image" field handles both images and Excel
      const text = formData.get('text') as string | null

      if (!file && !text) {
        return NextResponse.json({ error: 'File or text is required' }, { status: 400 })
      }

      if (file) {
        const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        const excelTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ]
        const isExcel = excelTypes.includes(file.type) ||
          file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')

        if (!imageTypes.includes(file.type) && !isExcel) {
          return NextResponse.json({
            error: 'Invalid file type. Supported: JPEG, PNG, GIF, WebP, Excel (.xlsx, .xls), CSV'
          }, { status: 400 })
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()

        if (isExcel) {
          // Convert Excel/CSV to text representation for AI parsing
          const workbook = XLSX.read(new Uint8Array(bytes), { type: 'array' })
          const textParts: string[] = []

          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName]
            if (!sheet) continue

            // Convert to CSV-like text preserving structure
            const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false })
            if (csv.trim()) {
              if (workbook.SheetNames.length > 1) {
                textParts.push(`--- Sheet: ${sheetName} ---`)
              }
              textParts.push(csv)
            }
          }

          const excelText = textParts.join('\n\n')
          if (!excelText.trim()) {
            return NextResponse.json({ error: 'Excel file appears to be empty' }, { status: 400 })
          }

          // Prepend Excel text to any additional context
          input.text = text?.trim()
            ? `${excelText}\n\nAdditional context: ${text}`
            : excelText
        } else {
          // Image path
          const base64 = Buffer.from(bytes).toString('base64')

          let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
          if (file.type === 'image/png') mediaType = 'image/png'
          else if (file.type === 'image/gif') mediaType = 'image/gif'
          else if (file.type === 'image/webp') mediaType = 'image/webp'

          input.image = { base64, mediaType }

          if (text?.trim()) {
            input.text = text
          }
        }
      } else if (text?.trim()) {
        input.text = text
      }
    } else {
      // JSON text-only path (backward compatible)
      const body = await request.json()
      const { text } = body

      if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: 'Plan text is required' }, { status: 400 })
      }

      input.text = text
    }

    const result = await parseWorkoutPlan(input)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      plan: result.plan,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    })
  } catch (error) {
    console.error('Parse plan error:', error)
    return NextResponse.json({ error: 'Failed to parse plan' }, { status: 500 })
  }
}
