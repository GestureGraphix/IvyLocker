import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

const ALLOWED = ['rest', 'low', 'medium', 'high']

// GET /api/athletes/day-intensity?start=YYYY-MM-DD&end=YYYY-MM-DD
// Returns the athlete's own per-day intensity markers (optionally within a range).
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    const rows = start && end
      ? await sql`
          SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, intensity
          FROM athlete_day_intensity
          WHERE athlete_id = ${user.id}
            AND date >= ${start}::date
            AND date <= ${end}::date
          ORDER BY date
        `
      : await sql`
          SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, intensity
          FROM athlete_day_intensity
          WHERE athlete_id = ${user.id}
          ORDER BY date
        `

    return NextResponse.json({ dayIntensities: rows })
  } catch (error) {
    console.error('Get day intensity error:', error)
    return NextResponse.json({ error: 'Failed to get day intensity' }, { status: 500 })
  }
}

// PATCH /api/athletes/day-intensity
// Body: { date: 'YYYY-MM-DD', intensity: 'rest' | 'low' | 'medium' | 'high' | null }
// Upserts the athlete's intensity for a day; a null/empty intensity clears it.
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { date, intensity } = body as { date?: string; intensity?: string | null }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A valid date (YYYY-MM-DD) is required' }, { status: 400 })
    }

    // Clearing: a null/empty intensity removes the athlete's marker for that day.
    if (!intensity) {
      await sql`
        DELETE FROM athlete_day_intensity
        WHERE athlete_id = ${user.id} AND date = ${date}::date
      `
      return NextResponse.json({ ok: true, cleared: true })
    }

    if (!ALLOWED.includes(intensity)) {
      return NextResponse.json(
        { error: `intensity must be one of: ${ALLOWED.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await sql`
      INSERT INTO athlete_day_intensity (athlete_id, date, intensity, updated_at)
      VALUES (${user.id}, ${date}::date, ${intensity}, NOW())
      ON CONFLICT (athlete_id, date)
      DO UPDATE SET intensity = EXCLUDED.intensity, updated_at = NOW()
      RETURNING TO_CHAR(date, 'YYYY-MM-DD') as date, intensity
    `

    return NextResponse.json({ ok: true, dayIntensity: result[0] })
  } catch (error) {
    console.error('Set day intensity error:', error)
    return NextResponse.json({ error: 'Failed to set day intensity' }, { status: 500 })
  }
}
