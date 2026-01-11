import { neon } from "@neondatabase/serverless"

// =============================================================================
// RATE LIMITING - Protect against infinite loops and runaway queries
// =============================================================================

interface RateLimitState {
  count: number
  resetTime: number
}

// Global rate limit: max queries per minute
const GLOBAL_RATE_LIMIT = 500 // queries per minute
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in ms

// In-memory rate limit tracking (resets on serverless cold start, which is fine)
const rateLimitState: RateLimitState = {
  count: 0,
  resetTime: Date.now() + RATE_LIMIT_WINDOW,
}

function checkRateLimit(): void {
  const now = Date.now()

  // Reset counter if window has passed
  if (now > rateLimitState.resetTime) {
    rateLimitState.count = 0
    rateLimitState.resetTime = now + RATE_LIMIT_WINDOW
  }

  // Check if limit exceeded
  if (rateLimitState.count >= GLOBAL_RATE_LIMIT) {
    console.error(`[DB RATE LIMIT] Exceeded ${GLOBAL_RATE_LIMIT} queries/minute. Blocking to prevent charges.`)
    throw new Error("Database rate limit exceeded. Please try again in a moment.")
  }

  // Increment counter
  rateLimitState.count++

  // Log warning at 80% capacity
  if (rateLimitState.count === Math.floor(GLOBAL_RATE_LIMIT * 0.8)) {
    console.warn(`[DB RATE LIMIT WARNING] Approaching limit: ${rateLimitState.count}/${GLOBAL_RATE_LIMIT} queries`)
  }
}

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

// Create a lazy SQL client that only connects when actually used
let _sql: ReturnType<typeof neon> | null = null

function getSQL(): ReturnType<typeof neon> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set")
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// Proxy needs a function as target for apply trap to work with tagged templates
// Includes rate limiting on every query
export const sql = new Proxy(function () {} as unknown as ReturnType<typeof neon>, {
  apply(_, __, args) {
    checkRateLimit()
    return (getSQL() as any)(...args)
  },
  get(_, prop) {
    return (getSQL() as any)[prop]
  },
})

// Helper function for transactions
export async function withTransaction<T>(callback: (sql: ReturnType<typeof neon>) => Promise<T>): Promise<T> {
  return callback(sql)
}

// Export rate limit stats for monitoring (optional)
export function getRateLimitStats() {
  return {
    currentCount: rateLimitState.count,
    limit: GLOBAL_RATE_LIMIT,
    resetsIn: Math.max(0, rateLimitState.resetTime - Date.now()),
  }
}
