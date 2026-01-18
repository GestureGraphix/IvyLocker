# CLAUDE.md - Locker Project Guide

## Project Overview

Locker is an athlete performance management platform for student-athletes. It helps track training, nutrition, recovery, academics, and provides AI-powered daily recommendations.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Neon PostgreSQL (serverless)
- **Auth**: Custom JWT-based authentication
- **Styling**: Tailwind CSS 4, Radix UI
- **Language**: TypeScript

## Project Structure

```
app/                    # Next.js App Router pages and API routes
  api/                  # API routes
    athletes/           # Athlete-specific endpoints
components/             # React components
  ui/                   # Shadcn/Radix UI components
  training/             # Training-related components
lib/                    # Utilities and shared code
  auth.ts               # Authentication utilities
  db.ts                 # Database connection (Neon)
scripts/                # SQL migration scripts
```

## Key Data Models

- **users**: Athletes and coaches
- **athlete_profiles**: Sport, goals, physical stats
- **sessions**: Training sessions (strength, conditioning, practice, competition)
- **check_in_logs**: Daily mental/physical state (1-10)
- **meal_logs**: Nutrition tracking with macros
- **hydration_logs**: Water intake
- **mobility_logs**: Recovery/mobility exercises
- **academic_items**: Assignments, exams, deadlines
- **courses**: Class schedule

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing

Optional:
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob for large file uploads
- `ANTHROPIC_API_KEY` - For AI recommendations (planned)

---

## Current Work: AI Daily Recommendations

**Status**: Implemented - Ready for testing

**Feature Spec**: See `docs/features/ai-daily-recommendations.md`

### Decisions Made

- **Model**: Claude 3 Haiku (lowest cost)
- **Schedule**: 5:00 AM UTC daily
- **Trigger**: Vercel Cron
- **Cost**: ~$0.001 per user per day (~$3/month for 100 users)

### Progress Tracker

- [x] Define feature requirements
- [x] Create feature specification document
- [x] Add database migration for `daily_recommendations` table
- [x] Install Anthropic SDK (`@anthropic-ai/sdk`)
- [x] Create data gathering utility (collect athlete context)
- [x] Create recommendation generation service
- [x] Create cron endpoint `/api/cron/daily-recommendations`
- [x] Create user-facing endpoint `/api/athletes/recommendations`
- [x] Add `vercel.json` with cron config
- [x] Build `DailyRecommendationCard` component
- [x] Add to dashboard
- [ ] Run database migration
- [ ] Test with sample data
- [ ] Deploy and monitor costs

### Files Created

- `scripts/005-daily-recommendations.sql` - Database migration
- `lib/ai/gather-athlete-data.ts` - Data collection utility
- `lib/ai/generate-recommendation.ts` - AI generation service
- `app/api/cron/daily-recommendations/route.ts` - Cron endpoint
- `app/api/athletes/recommendations/route.ts` - User API
- `components/dashboard/daily-recommendation-card.tsx` - UI component
- `vercel.json` - Cron configuration

### Environment Variables Needed

```
ANTHROPIC_API_KEY=sk-ant-...
CRON_SECRET=<random-string-for-cron-auth>
```

### Testing

1. Run the database migration: `npx tsx scripts/run-migration.ts scripts/005-daily-recommendations.sql`
2. Add `ANTHROPIC_API_KEY` to `.env.local`
3. Start dev server: `npm run dev`
4. Open dashboard - click "Generate Recommendations" button
5. Or test cron directly: `curl http://localhost:3000/api/cron/daily-recommendations`

---

## Current Work: Bulk Workout Assignment

**Status**: Phase 1 Complete - Groups & Assignment

**Feature Spec**: See `docs/features/bulk-workout-assignment.md`

### Problem

Coaches send weekly training plans via email. Athletes manually parse and update their calendars. This is slow and error-prone.

### Solution

1. Coach pastes training plan text (email-style)
2. AI parses into structured workouts
3. System assigns correct workout to each athlete by group (SS, LS, Jumps, etc.)
4. One click to publish to entire team

### Key Components

- **Athlete Groups**: Tag athletes as SS, LS, Jumps, Hurdles, etc.
- **AI Parsing**: Convert email text to structured workouts
- **Weekly Plans**: Create, preview, publish workout weeks
- **Athlete View**: See personalized daily workout

### Implementation Phases

1. **Phase 1**: Groups + basic assignment ✅
2. **Phase 2**: AI parsing (paste-to-plan)
3. **Phase 3**: Athlete experience (today's workout card)
4. **Phase 4**: Templates + reuse

### Progress Tracker

- [x] Define feature requirements
- [x] Create feature specification document
- [x] Create database migration for groups tables
- [x] Build group management API endpoints
- [x] Build group management UI (`/coach/groups`)
- [x] Add athlete-to-group assignment functionality
- [ ] Create AI parsing endpoint
- [ ] Build weekly plan builder UI
- [ ] Create athlete schedule API
- [ ] Build "Today's Workout" component
- [ ] Add completion tracking

### Phase 1 Files Created

- `scripts/006-athlete-groups.sql` - Groups database migration
- `app/api/coach/groups/route.ts` - List/create groups
- `app/api/coach/groups/[id]/route.ts` - Get/update/delete group
- `app/api/coach/groups/[id]/members/route.ts` - Manage group members
- `app/coach/groups/page.tsx` - Groups management page
- `components/coach/groups-manager.tsx` - Groups list UI
- `components/coach/create-group-dialog.tsx` - Create/edit group dialog
- `components/coach/manage-group-members-dialog.tsx` - Add/remove athletes
