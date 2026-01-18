import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { generateAndSaveRecommendation } from '@/lib/ai/generate-recommendation'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // In development, allow requests without secret
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    return true
  }

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active athlete users
    const users = await sql`
      SELECT u.id
      FROM users u
      WHERE u.role = 'ATHLETE'
      ORDER BY u.created_at
    `

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Generate recommendations for each user
    // Process in batches of 5 to avoid overwhelming the API
    const batchSize = 5
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize)

      const batchResults = await Promise.all(
        batch.map(async (user: { id: string }) => {
          try {
            const result = await generateAndSaveRecommendation(user.id)
            return { userId: user.id, ...result }
          } catch (error) {
            return {
              userId: user.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })
      )

      for (const result of batchResults) {
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`User ${result.userId}: ${result.error}`)
        }
      }
    }

    console.log(`Daily recommendations generated: ${results.success}/${results.total} successful`)

    return NextResponse.json({
      message: 'Daily recommendations generated',
      ...results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
