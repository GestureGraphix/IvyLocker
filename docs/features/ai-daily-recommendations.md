# AI Daily Recommendations Feature

## Overview

Generate personalized daily guidance for student-athletes based on their training schedule, nutrition, recovery data, and academic commitments.

## Goals

- Provide actionable, practical daily advice
- Adjust recommendations to fit student life (classes, late nights, exams)
- Help athletes optimize performance without overcomplicating their day

## Scope

### What the AI WILL do:
- Use data provided by coaches and logged by athletes
- Apply common-sense performance principles
- Prioritize recommendations based on training schedule
- Adjust timing for student schedules

### What the AI will NOT do:
- Ask questions
- Provide medical advice
- Recommend supplements, weight loss, or extreme dietary practices
- Invent workouts, loads, or targets

### Recommendation Categories:
1. **Sleep** - Timing and prioritization
2. **Meals** - Timing and macro emphasis (carbs/protein/balanced)
3. **Recovery** - When to prioritize rest/mobility
4. **Hydration** - Reminders based on training intensity

## Data Inputs

Data collected from database for each user:

```
athlete_profile:
  - sport, position, level
  - height_cm, weight_kg
  - calorie_goal, protein_goal_grams, hydration_goal_oz

today's_sessions:
  - type (strength/conditioning/practice/competition)
  - start_at, end_at
  - intensity (low/medium/high)
  - focus

recent_check_ins (last 3 days):
  - mental_state (1-10)
  - physical_state (1-10)

today's_meals (so far):
  - calories, protein, carbs consumed

today's_hydration:
  - total ounces consumed

upcoming_academics (next 3 days):
  - type (exam/assignment/project)
  - due_date
  - priority
```

## AI Prompt Template

```
You are Locker's Athlete Performance Recommendation Engine.

Your role is to transform coach-provided training plans and athlete context
into clear, practical daily guidance for student-athletes.

You do not:
- Ask questions
- Provide medical advice
- Recommend supplements, weight loss, or extreme dietary practices
- Invent workouts, loads, or targets

You only:
- Use the data provided
- Apply common-sense performance principles
- Adjust timing and priorities to fit student life (late nights, classes, exams)

You must stay within the scope of:
- Sleep timing and prioritisation
- Meal timing and macro emphasis (carbs / protein / balanced)
- Recovery prioritisation
- Hydration reminders

If information is missing, make reasonable assumptions and state them briefly.

---

ATHLETE CONTEXT:
{athlete_data}

TODAY'S TRAINING:
{sessions}

RECENT WELLNESS (last 3 days):
{check_ins}

NUTRITION TODAY:
{meals_and_hydration}

UPCOMING ACADEMIC DEADLINES:
{academics}

---

Provide today's recommendations in this format:

**Priority Focus**: [One sentence summary of the day's main focus]

**Sleep**: [Recommendation]

**Nutrition**:
- Pre-training: [Timing and what to eat]
- Post-training: [Timing and what to eat]
- Evening: [If applicable]

**Recovery**: [Specific recommendation based on training load and wellness scores]

**Hydration**: [Target and timing]

**Student Life Note**: [Any adjustment for academic schedule, if relevant]
```

## Technical Implementation

### Database Schema Addition

```sql
CREATE TABLE IF NOT EXISTS daily_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  recommendation_text TEXT NOT NULL,
  priority_focus TEXT,
  model_used TEXT DEFAULT 'claude-3-haiku-20240307',
  tokens_used INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_recommendations_user_date ON daily_recommendations(user_id, date);
```

### API Endpoints

1. **Generate recommendation** (internal/cron)
   - `POST /api/internal/generate-recommendations`
   - Runs daily at 5:00 AM local time
   - Generates for all active users

2. **Get today's recommendation** (user-facing)
   - `GET /api/athletes/recommendations/today`
   - Returns cached recommendation for current user

3. **Regenerate recommendation** (manual trigger)
   - `POST /api/athletes/recommendations/regenerate`
   - Rate limited to 1 per day per user

### Model Selection

**Model**: `claude-3-haiku-20240307` (lowest cost)

### Trigger Mechanism

**Method**: Vercel Cron

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-recommendations",
      "schedule": "0 5 * * *"
    }
  ]
}
```

- Runs at 5:00 AM UTC daily
- Free on Vercel Hobby tier (1 cron job)
- Endpoint secured with `CRON_SECRET` env var

### Cost Estimation

Using Claude Haiku:
- Input: ~1,500 tokens (athlete data)
- Output: ~500 tokens (recommendation)
- Cost per request: ~$0.001

Monthly costs by user count:
| Users | Daily Cost | Monthly Cost |
|-------|------------|--------------|
| 10    | $0.01      | $0.30        |
| 100   | $0.10      | $3.00        |
| 1,000 | $1.00      | $30.00       |

### Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
```

## UI/UX

### Display Location
- Dashboard home page, top card
- "Today's Game Plan" or "Daily Recommendations"

### Components Needed
- `DailyRecommendationCard` - Main display component
- Shows priority focus prominently
- Collapsible sections for details
- "Generated at X:XX AM" timestamp
- Optional: "Regenerate" button (with confirmation)

## Rollout Plan

1. **Phase 1**: Manual testing with test account
2. **Phase 2**: Enable for select beta users
3. **Phase 3**: Enable for all users with feature flag
4. **Phase 4**: Remove feature flag, always on

## Decisions

- **Model**: Claude 3 Haiku (lowest cost)
- **Schedule**: 5:00 AM UTC daily via Vercel Cron
- **Storage**: Store in database, one per user per day

## Open Questions

- [ ] Should recommendations be editable by coaches?
- [ ] How to handle users with no training scheduled? (Suggest: generic recovery/nutrition tips)
- [ ] Should we store recommendation history for trends?
- [ ] Timezone handling - currently UTC, may need per-user timezone later

## Dependencies

- Anthropic API account with credits
- Cron job infrastructure (Vercel Cron or external)
