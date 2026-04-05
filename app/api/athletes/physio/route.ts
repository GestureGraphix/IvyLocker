import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// GET /api/athletes/physio - List all physios + which ones this athlete is linked to
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // All physios
    const physios = await sql`
      SELECT
        u.id, u.name, u.email, u.scheduling_link,
        EXISTS(
          SELECT 1 FROM physio_athletes pa
          WHERE pa.physio_id = u.id AND pa.athlete_id = ${user.id}
        ) as linked
      FROM users u
      WHERE u.role = 'PHYSIO'
      ORDER BY u.name
    `

    return NextResponse.json({ physios })
  } catch (error) {
    console.error('Get physios error:', error)
    return NextResponse.json({ error: 'Failed to get physios' }, { status: 500 })
  }
}

// POST /api/athletes/physio - Athlete links themselves to a physio
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { physioId } = await request.json()
    if (!physioId) return NextResponse.json({ error: 'physioId is required' }, { status: 400 })

    // Verify the physio exists
    const physio = await sql`SELECT id, name FROM users WHERE id = ${physioId} AND role = 'PHYSIO'`
    if (physio.length === 0) {
      return NextResponse.json({ error: 'Physio not found' }, { status: 404 })
    }

    // Check if already linked
    const existing = await sql`
      SELECT id FROM physio_athletes WHERE physio_id = ${physioId} AND athlete_id = ${user.id}
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Already linked to this physio' }, { status: 400 })
    }

    await sql`
      INSERT INTO physio_athletes (physio_id, athlete_id)
      VALUES (${physioId}, ${user.id})
    `

    return NextResponse.json({ success: true, message: `Linked to ${physio[0].name}` })
  } catch (error) {
    console.error('Link physio error:', error)
    return NextResponse.json({ error: 'Failed to link physio' }, { status: 500 })
  }
}

// DELETE /api/athletes/physio?physioId=... - Athlete unlinks from a physio
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const physioId = searchParams.get('physioId')
    if (!physioId) return NextResponse.json({ error: 'physioId is required' }, { status: 400 })

    await sql`
      DELETE FROM physio_athletes WHERE physio_id = ${physioId} AND athlete_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unlink physio error:', error)
    return NextResponse.json({ error: 'Failed to unlink physio' }, { status: 500 })
  }
}
