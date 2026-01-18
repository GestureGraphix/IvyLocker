# Bulk Workout Assignment Feature

## Problem Statement

Coaches currently send weekly training plans via email (like the Yale track example). Athletes must manually parse these emails and update their own calendars. This is:
- Time-consuming for coaches (formatting emails, sending updates)
- Error-prone for athletes (missing workouts, wrong times)
- No accountability tracking
- No integration with nutrition/recovery recommendations

## Goal

Enable coaches to assign a full week of workouts to 50+ athletes in under 2 minutes.

## User Stories

### Coach Flow
1. Coach opens "Create Weekly Plan"
2. Pastes or types training plan (email-style or structured)
3. AI parses into structured workouts, identifying group-specific variations
4. Coach reviews, adjusts if needed
5. One click to publish → All athletes get their personalized schedule

### Athlete Flow
1. Opens app → Sees today's workout automatically
2. Workout is specific to their group (e.g., SS sees 5x150m, not 5x200m)
3. Can mark as completed, log notes
4. Feeds into AI daily recommendations

## Core Concepts

### Athlete Groups
Athletes belong to one or more groups. Examples for track:
- `sprints-short` (SS) - 100m, 200m
- `sprints-long` (LS) - 400m
- `hurdles` - 100H, 110H, 400H
- `jumps` - Long jump, triple jump, high jump
- `throws` - Shot put, discus, javelin
- `distance` - 800m+
- `multi` - Heptathlon, decathlon

### Workout Templates
Reusable workout structures:
- "Monday Base" - Standard Monday workout
- "Speed Development A" - Specific session type
- "Taper Week Day 1" - Competition prep

### Weekly Plans
A collection of daily workouts that can be:
- Created from scratch
- Generated from pasted text
- Based on previous weeks

## AI Parsing Logic

### Input Example (Coach's Email)
```
Monday
  Warmup, SD 1, flat strides
  Accels: 3x (10m 20m 30m) flats on grass, 1m rest per 10m, 2pt start
  Testing: 3x Standing Long Jump and 3x Overhead Backwards Shotput Throw
  Lift

Tuesday
  Warmup, hurdle mobility (hurdlers do hurdle drills)
  Wickets: 5 reps (5.5', 6', 6.5' spacing)
  Stadiums: 6 reps, jog between

Friday
  Warmup, hurdle mobility (hurdlers do hurdle drills), flat strides
  LS: 5x200m 84% 5m rest (25.0-26.2, 29.1-31.0)
  SS: 5x150m 85% 5m rest (18.5-18.9, 20.1-21.7)
  Jumps: 5x120m 85% 5m rest (15.5, 17.3-17.6)
```

### AI Output (Structured)
```json
{
  "weekStartDate": "2026-01-20",
  "days": [
    {
      "dayOfWeek": "monday",
      "sessions": [
        {
          "type": "practice",
          "time": null,
          "forGroups": ["all"],
          "exercises": [
            { "name": "Warmup, SD 1, flat strides", "details": null },
            { "name": "Accels", "details": "3x (10m 20m 30m) flats on grass, 1m rest per 10m, 2pt start" },
            { "name": "Testing", "details": "3x Standing Long Jump and 3x Overhead Backwards Shotput Throw" }
          ]
        },
        {
          "type": "lift",
          "time": null,
          "forGroups": ["all"],
          "exercises": []
        }
      ]
    },
    {
      "dayOfWeek": "friday",
      "sessions": [
        {
          "type": "practice",
          "forGroups": ["all"],
          "exercises": [
            { "name": "Warmup, hurdle mobility, flat strides", "details": null }
          ]
        },
        {
          "type": "practice",
          "forGroups": ["sprints-long"],
          "exercises": [
            { "name": "Speed Work", "details": "5x200m 84% 5m rest (25.0-26.2, 29.1-31.0)" }
          ]
        },
        {
          "type": "practice",
          "forGroups": ["sprints-short"],
          "exercises": [
            { "name": "Speed Work", "details": "5x150m 85% 5m rest (18.5-18.9, 20.1-21.7)" }
          ]
        },
        {
          "type": "practice",
          "forGroups": ["jumps"],
          "exercises": [
            { "name": "Speed Work", "details": "5x120m 85% 5m rest (15.5, 17.3-17.6)" }
          ]
        }
      ]
    }
  ]
}
```

### Parsing Rules
1. Recognize day headers (Monday, Tuesday, etc.)
2. Identify group-specific lines: "LS:", "SS:", "Jumps:", "(hurdlers do X)"
3. Extract time patterns: "4:45-5:45", "6:30pm"
4. Recognize session types: "Lift", "Practice", "Optional"
5. Parse exercise details: sets, reps, rest, percentages, target times

## Database Schema

```sql
-- Athlete groups (SS, LS, Jumps, etc.)
CREATE TABLE athlete_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- 'sprints-short', 'hurdles'
  color TEXT, -- For UI display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, slug)
);

-- Athletes can belong to multiple groups
CREATE TABLE athlete_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES athlete_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(athlete_id, group_id)
);

-- Weekly plans created by coaches
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT, -- "Week 3 - Base Building"
  week_start_date DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source_text TEXT, -- Original pasted text for reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Daily workouts within a weekly plan
CREATE TABLE plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weekly_plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  is_off_day BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions within a day (practice, lift, optional)
CREATE TABLE plan_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID REFERENCES plan_days(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('practice', 'lift', 'conditioning', 'recovery', 'competition', 'optional')),
  start_time TIME,
  end_time TIME,
  location TEXT,
  is_optional BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Which groups this session applies to
CREATE TABLE plan_session_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
  group_id UUID REFERENCES athlete_groups(id) ON DELETE CASCADE,
  -- NULL group_id means "all athletes"
  UNIQUE(plan_session_id, group_id)
);

-- Exercises/activities within a session
CREATE TABLE plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  details TEXT, -- "5x200m 84% 5m rest"
  target_groups TEXT[], -- ['sprints-long'] or NULL for all
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout templates for reuse
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  description TEXT,
  session_type TEXT,
  exercises JSONB NOT NULL, -- Array of exercise objects
  target_groups TEXT[], -- Which groups this is designed for
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track when athletes complete assigned workouts
CREATE TABLE workout_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_session_id UUID REFERENCES plan_sessions(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  perceived_effort INTEGER CHECK (perceived_effort BETWEEN 1 AND 10),
  UNIQUE(athlete_id, plan_session_id)
);
```

## API Endpoints

### Weekly Plans
- `POST /api/coach/weekly-plans` - Create new plan
- `GET /api/coach/weekly-plans` - List plans
- `GET /api/coach/weekly-plans/:id` - Get plan details
- `PATCH /api/coach/weekly-plans/:id` - Update plan
- `POST /api/coach/weekly-plans/:id/publish` - Publish to athletes
- `DELETE /api/coach/weekly-plans/:id` - Delete plan

### AI Parsing
- `POST /api/coach/parse-workout-text` - Parse email/text into structured plan

### Groups
- `GET /api/coach/groups` - List groups
- `POST /api/coach/groups` - Create group
- `POST /api/coach/groups/:id/members` - Add athletes to group
- `DELETE /api/coach/groups/:id/members/:athleteId` - Remove from group

### Athlete View
- `GET /api/athletes/schedule` - Get my assigned workouts
- `GET /api/athletes/schedule/today` - Today's workout
- `POST /api/athletes/workouts/:sessionId/complete` - Mark completed

### Templates
- `GET /api/coach/templates` - List templates
- `POST /api/coach/templates` - Save template
- `POST /api/coach/templates/:id/apply` - Apply template to a day

## UI Components

### Coach Interface

#### 1. Weekly Plan Builder (`/coach/plans/new`)
```
┌─────────────────────────────────────────────────────────────┐
│  Create Weekly Plan                          Week of Jan 20 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Paste your training plan here...                    │    │
│  │                                                     │    │
│  │ Monday                                              │    │
│  │   Warmup, SD 1, flat strides                       │    │
│  │   Accels: 3x (10m 20m 30m)...                      │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Parse with AI]                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Preview:                                                   │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐        │
│  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat  │ Sun  │        │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤        │
│  │Practice│Practice│ OFF │Practice│Practice│ OFF │ OFF │   │
│  │ Lift │      │     │ Lift │      │     │     │        │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘        │
│                                                             │
│  Group-specific workouts detected:                          │
│  • Friday: LS gets 5x200m, SS gets 5x150m, Jumps get 5x120m│
│                                                             │
│  [Save Draft]  [Publish to Athletes]                        │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Group Manager (`/coach/groups`)
```
┌─────────────────────────────────────────────────────────────┐
│  Athlete Groups                              [+ New Group]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ 🟡 Short Sprints│  │ 🔵 Long Sprints │                   │
│  │ SS • 8 athletes │  │ LS • 6 athletes │                   │
│  │ Alex, Jordan... │  │ Sam, Taylor...  │                   │
│  │ [Edit] [Manage] │  │ [Edit] [Manage] │                   │
│  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ 🟣 Hurdles      │  │ 🟢 Jumps        │                   │
│  │ 4 athletes      │  │ 5 athletes      │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Add Athletes to Group (Modal)
```
┌─────────────────────────────────────────────────────────────┐
│  Add Athletes to "Short Sprints"                      [X]   │
├─────────────────────────────────────────────────────────────┤
│  Search: [________________]                                 │
│                                                             │
│  ☑ Alex Johnson         Already in: Relays                 │
│  ☑ Jordan Smith         Already in: —                      │
│  ☐ Casey Williams       Already in: Long Sprints           │
│  ☐ Morgan Davis         Already in: Hurdles                │
│                                                             │
│  [Cancel]  [Add Selected (2)]                               │
└─────────────────────────────────────────────────────────────┘
```

### Athlete Interface

#### Today's Workout Card (Dashboard)
```
┌─────────────────────────────────────────────────────────────┐
│  📋 Today's Workout                           Thursday      │
├─────────────────────────────────────────────────────────────┤
│  Practice • 4:45 PM                                         │
│  ─────────────────────────────────                          │
│  • Warmup, SD 1, flat strides                              │
│  • Testing: 3x Standing Triple Jump, 3x Vertical Jump      │
│  • Hills: 3x (30m 40m) 1m rest per 10m                     │
│                                                             │
│  Lift • 6:30 PM • PWG                                       │
│  ─────────────────────────────────                          │
│  • Scheduled lift session                                   │
│                                                             │
│  [Mark Complete]                   Assigned by Coach Smith  │
└─────────────────────────────────────────────────────────────┘
```

## AI Prompt for Parsing

```
You are a workout plan parser for a sports team management app.

Parse the following training plan text into a structured JSON format.

Rules:
1. Identify days of the week as top-level sections
2. Identify session types: "Lift" = lift, "Optional" = optional practice, otherwise = practice
3. Detect group-specific workouts:
   - "LS:" or "Long Sprints:" → group: "sprints-long"
   - "SS:" or "Short Sprints:" → group: "sprints-short"
   - "Jumps:" → group: "jumps"
   - "(hurdlers do X)" → note for group: "hurdles"
4. Extract times if present (e.g., "4:45-5:45")
5. Mark off days (Wednesday: Off)

Output JSON format:
{
  "days": [
    {
      "dayOfWeek": "monday",
      "isOffDay": false,
      "sessions": [
        {
          "type": "practice|lift|optional",
          "startTime": "16:45" or null,
          "endTime": "17:45" or null,
          "location": "PWG" or null,
          "forGroups": ["all"] or ["sprints-short", "hurdles"],
          "exercises": [
            {
              "name": "Exercise name",
              "details": "Additional details or null",
              "forGroups": ["all"] or ["specific-group"]
            }
          ]
        }
      ]
    }
  ]
}

Training Plan Text:
---
{input_text}
---

Return only valid JSON, no explanation.
```

## Implementation Plan

### Phase 1: Foundation (Groups & Basic Assignment)
1. Create database migration for groups tables
2. Build group management UI for coaches
3. Allow coaches to tag athletes with groups
4. Basic manual workout creation per group

### Phase 2: AI Parsing
1. Create parsing endpoint with Claude
2. Build paste-to-plan UI
3. Preview and edit parsed results
4. Publish to athletes

### Phase 3: Athlete Experience
1. Today's workout card on dashboard
2. Weekly schedule view
3. Mark workouts as complete
4. Integration with daily AI recommendations

### Phase 4: Templates & Reuse
1. Save workouts as templates
2. Clone previous weeks
3. Template library per team

## Success Metrics

- **Time to assign**: < 2 minutes for full week (down from 30+ min)
- **Coach adoption**: 80% of coaches use weekly plans
- **Athlete engagement**: 70% view their workout daily
- **Completion tracking**: 60% of workouts marked complete

## Open Questions

- [ ] Should athletes be able to modify their assigned workouts?
- [ ] How to handle schedule conflicts (practice overlaps with class)?
- [ ] Should we support multiple teams per coach?
- [ ] Integration with external calendars (Google, Apple)?
- [ ] How to handle mid-week changes to the plan?

## Dependencies

- Existing: User auth, athlete profiles, sessions table
- New: Teams table (if not exists), AI parsing with Claude
- Optional: Calendar export (ics), push notifications
