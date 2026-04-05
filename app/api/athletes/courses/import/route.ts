import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// Maps iCal BYDAY abbreviations to our format
const ICAL_DAY_MAP: Record<string, string> = {
  SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat',
}

interface ParsedCourse {
  name: string
  code: string
  instructor: string | null
  schedule: string
  meeting_days: string[]
}

function parseICS(icsText: string): ParsedCourse[] {
  const courses: ParsedCourse[] = []
  const events = icsText.split('BEGIN:VEVENT')

  for (let i = 1; i < events.length; i++) {
    const block = events[i].split('END:VEVENT')[0]
    if (!block) continue

    const getField = (name: string): string | null => {
      // Handle fields with parameters like DTSTART;TZID=...:value
      const regex = new RegExp(`^${name}[;:](.*)$`, 'm')
      const match = block.match(regex)
      if (!match) return null
      // Get the value after the last colon (handles TZID params)
      const parts = match[1].split(':')
      return parts[parts.length - 1].trim()
    }

    const getRawField = (name: string): string | null => {
      const regex = new RegExp(`^${name}[;:](.*)$`, 'm')
      const match = block.match(regex)
      return match ? match[1].trim() : null
    }

    const summary = getField('SUMMARY')
    if (!summary) continue

    // Parse description for course name and instructor
    const descRaw = getRawField('DESCRIPTION')
    let courseName = summary
    let instructor: string | null = null

    if (descRaw) {
      // Value is after the colon for fields with params
      const descValue = descRaw.includes(':') ? descRaw.split(':').slice(1).join(':') : descRaw
      const descClean = descValue.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\,/g, ',')
      const lines = descClean.split('\n').map(l => l.trim()).filter(Boolean)

      if (lines.length > 0) courseName = lines[0]
      const instructorLine = lines.find(l => l.startsWith('Instructor:'))
      if (instructorLine) instructor = instructorLine.replace('Instructor:', '').trim()
    }

    // Parse meeting days from RRULE
    const rruleRaw = getRawField('RRULE')
    const meetingDays: string[] = []
    if (rruleRaw) {
      const rruleValue = rruleRaw.includes(':') ? rruleRaw.split(':').slice(1).join(':') : rruleRaw
      const byDayMatch = rruleValue.match(/BYDAY=([A-Z,]+)/)
      if (byDayMatch) {
        byDayMatch[1].split(',').forEach(d => {
          const mapped = ICAL_DAY_MAP[d]
          if (mapped) meetingDays.push(mapped)
        })
      }
    }

    // Parse times
    const dtStartRaw = getRawField('DTSTART')
    const dtEndRaw = getRawField('DTEND')
    let schedule = ''

    if (dtStartRaw && dtEndRaw) {
      const startTime = extractTime(dtStartRaw)
      const endTime = extractTime(dtEndRaw)
      if (startTime && endTime) {
        const days = meetingDays.length > 0 ? meetingDays.join('/') + ' ' : ''
        schedule = `${days}${formatTime12(startTime)} - ${formatTime12(endTime)}`
      }
    }

    courses.push({
      name: courseName,
      code: summary, // SUMMARY is usually the course code like "CPSC 4550"
      instructor,
      schedule,
      meeting_days: meetingDays,
    })
  }

  return courses
}

function extractTime(raw: string): string | null {
  // Handle "America/New_York:20260902T103000" or just "20260902T103000"
  const value = raw.includes(':') ? raw.split(':').pop()! : raw
  const match = value.match(/T(\d{2})(\d{2})/)
  if (!match) return null
  return `${match[1]}:${match[2]}`
}

function formatTime12(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// POST /api/athletes/courses/import - Import courses from .ics file
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.ics')) {
      return NextResponse.json({ error: 'File must be a .ics calendar file' }, { status: 400 })
    }

    const text = await file.text()
    if (!text.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json({ error: 'Invalid .ics file' }, { status: 400 })
    }

    const parsed = parseICS(text)
    if (parsed.length === 0) {
      return NextResponse.json({ error: 'No courses found in the file' }, { status: 400 })
    }

    // Get existing courses to avoid duplicates
    const existing = await sql`
      SELECT code FROM courses WHERE user_id = ${user.id}
    `
    const existingCodes = new Set(existing.map((c: { code: string }) => c.code?.toLowerCase()))

    const imported: string[] = []
    const skipped: string[] = []

    for (const course of parsed) {
      if (existingCodes.has(course.code.toLowerCase())) {
        skipped.push(course.code)
        continue
      }

      await sql`
        INSERT INTO courses (user_id, name, code, instructor, schedule, meeting_days)
        VALUES (${user.id}, ${course.name}, ${course.code}, ${course.instructor}, ${course.schedule}, ${course.meeting_days})
      `
      imported.push(course.code)
      existingCodes.add(course.code.toLowerCase())
    }

    return NextResponse.json({
      imported: imported.length,
      skipped: skipped.length,
      courses: imported,
      skippedCourses: skipped,
      message: `Imported ${imported.length} course${imported.length !== 1 ? 's' : ''}${skipped.length > 0 ? `, skipped ${skipped.length} duplicate${skipped.length !== 1 ? 's' : ''}` : ''}`,
    })
  } catch (error) {
    console.error('Import courses error:', error)
    return NextResponse.json({ error: 'Failed to import courses' }, { status: 500 })
  }
}
