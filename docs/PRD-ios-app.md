# Locker iOS App - Product Requirements Document

## 1. Overview

### What Exists Today
Locker is a Next.js 16 web application for student-athlete performance management. It runs on Neon PostgreSQL, uses custom JWT auth, Tailwind CSS + Radix UI, and integrates Claude AI for recommendations and food analysis. The web app is fully functional with 16 user-facing screens, 50+ API endpoints, and 20+ database tables.

### Why Transition to iOS
- Primary users are college athletes who live on their phones
- Key interactions (logging water, checking today's workout, snapping food photos) are faster as native actions
- Push notifications enable timely hydration reminders, workout alerts, and academic deadline nudges
- Camera access for food analysis and form analysis video is smoother natively
- Offline support matters for athletes in gyms/tracks with poor connectivity
- App Store presence builds credibility for coach adoption

### What This PRD Covers
A native iOS app that replaces the web app as the primary athlete experience while keeping the web app alive as the coach portal.

---

## 2. Users & Roles

| Role | Primary Platform | Description |
|------|-----------------|-------------|
| **Athlete** | iOS App | Student-athletes who track daily training, nutrition, recovery, and academics |
| **Coach** | Web (existing) | Coaches who manage rosters, create workout plans, monitor athlete wellness |

Coaches continue using the web app. The iOS app is athlete-focused. A coach who is also an athlete can use both.

---

## 3. Current Feature Inventory

Everything below exists in the web app today and must be supported in the iOS app unless marked otherwise.

### 3.1 Dashboard (Home)
- Time-based greeting ("Good morning, Alex")
- Daily check-in widget: mental state (1-10) + physical state (1-10) + notes
- AI daily recommendation card (generated via Claude Haiku at 5AM UTC or on-demand)
- Today's stats: hydration (oz), meals logged, training sessions completed, wellness score
- Progress bars: hydration vs goal, calories vs goal, protein vs goal
- Upcoming items: today's workouts + academic deadlines this week

### 3.2 Schedule
- Weekly calendar view (Sun-Sat) with prev/next navigation
- Aggregated items from three sources:
  - Coach-assigned workouts (with times, locations, group info)
  - Personal training sessions
  - Academic deadlines and class schedule
- Color-coded by type, completion checkmarks
- Tap to expand item details

### 3.3 Training
- **Sessions**: CRUD for personal training sessions
  - Types: strength, conditioning, practice, competition
  - Fields: title, date/time, intensity (low/med/high), focus, notes
  - Exercises within sessions: name, notes, sort order
  - Sets within exercises: reps, weight, RPE (1-10), completion toggle
- **Templates**: Reusable session blueprints with recurring schedules (weekday selection, start time, optional end date). Auto-generate sessions from templates.
- **Coach-assigned workouts**: View workout details (session type, exercises, times, location), mark complete with perceived effort (1-10) and notes
- **Form analysis**: Upload two videos (reference + attempt), MediaPipe pose detection extracts landmarks, joint angle comparison, overall score (0-100), per-joint deviation feedback, key frame identification
- **Training history**: View completed sessions and workouts with stats
- Filters: All, Strength, Conditioning, Practice, Competition

### 3.4 Fuel (Nutrition)
- **Meal logging**: meal type (breakfast/lunch/dinner/snack), description, calories, protein, carbs, fat, sodium, fiber, timestamp
- **AI food photo analysis**: Take a photo of food or a nutrition label, Claude vision estimates macros (3 uses/day limit)
- **Hydration tracking**: Log water intake (ounces) with source and time, daily total vs goal
- **Yale dining menu integration**: Browse dining hall menus by college (14 halls), see nutritional info, one-tap log to meal log
- Daily summary cards: calories, protein, carbs, fat with progress bars
- Edit/delete logged meals and hydration entries

### 3.5 Mobility (Recovery)
- Exercise library organized by body group: Back, Hips, Shoulders, Ankles, Knees, Full Body
- Each exercise: name, sets, reps or duration, YouTube video link
- Log completed mobility work with duration and notes
- History of past mobility sessions
- Pre-seeded library of common exercises

### 3.6 Academics
- **Courses**: name, code, instructor, schedule
- **Academic items**: assignment, exam, quiz, project
  - Fields: title, course, due date, priority (high/med/low), notes, completion status
- Stats: upcoming count, overdue count, completed count, high-priority count
- Items sorted by due date

### 3.7 Account / Profile
- Personal info: name, email, sport, team, position, phone, location, university, graduation year
- Physical stats: height (cm), weight (kg)
- Nutrition goals: daily calories, protein (g), hydration (oz)
- Change password
- Logout

### 3.8 Authentication
- Email + password registration (athlete or coach role selection)
- Login with email + password
- JWT tokens stored in HTTP-only cookies (web) - needs adaptation for iOS
- Session duration: 7 days

---

## 4. iOS App Architecture

### 4.1 Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | Swift | Native performance, App Store standard |
| **UI Framework** | SwiftUI | Modern declarative UI, great for the card-based layout Locker uses |
| **Navigation** | TabView + NavigationStack | Maps directly to existing bottom nav (6 tabs) + push navigation |
| **Networking** | URLSession + async/await | Native, no dependencies needed |
| **Local Storage** | SwiftData (Core Data successor) | Offline cache for sessions, meals, hydration logs |
| **Auth Token Storage** | Keychain | Secure storage for JWT tokens |
| **Camera** | AVFoundation + PhotosUI | Food photo capture, form analysis video recording |
| **Video Processing** | MediaPipe iOS SDK | Pose detection for form analysis (same models as web) |
| **Push Notifications** | APNs + server-side trigger | Hydration reminders, workout alerts, academic deadlines |
| **Charts** | Swift Charts | Native replacement for Recharts (progress bars, deviation charts) |

### 4.2 Backend Strategy

**Keep the existing Next.js API routes as-is.** The iOS app calls the same `/api/*` endpoints. Changes needed:

1. **Auth adaptation**: Replace cookie-based auth with Bearer token auth
   - Add `Authorization: Bearer <jwt>` header support to `getCurrentUser()`
   - Keep cookie auth working for the web app
   - Return the JWT token in the login/register response body (currently only set as cookie)

2. **Push notification infrastructure**: New endpoint + table
   - `device_tokens` table: user_id, device_token, platform, created_at
   - `POST /api/devices/register` - register APNs device token
   - Server-side APNs sending for reminders

3. **No other backend changes required** - all existing API routes return JSON and work with any HTTP client

### 4.3 Offline Strategy

| Data | Offline Behavior |
|------|-----------------|
| Hydration logs | Queue locally, sync when online |
| Meal logs | Queue locally, sync when online |
| Check-in | Queue locally, sync when online |
| Sessions/workouts | Read from cache, queue completions |
| Schedule | Cache last-fetched week |
| Recommendations | Cache latest, show stale indicator |
| Form analysis | Requires network (video upload + pose model) |
| Yale dining menus | Cache today's menu |

---

## 5. iOS Screen Map

### Tab Bar (5 tabs + More)
Maps from the existing mobile nav with minor reorganization:

```
[Home]  [Schedule]  [Training]  [Fuel]  [More]
```

**More** contains: Academics, Mobility, Account

### Screen Hierarchy

```
Tab 1: Home
  ├── Dashboard (check-in, stats, recommendations, upcoming)
  └── AI Recommendation detail

Tab 2: Schedule
  └── Weekly calendar (coach workouts, sessions, academics)

Tab 3: Training
  ├── Active sessions list + coach-assigned workouts
  ├── Add/Edit session
  │   └── Add/Edit exercises + sets
  ├── Templates list
  │   └── Create/Edit template
  ├── Form Analysis
  │   ├── Record/select reference video
  │   ├── Record/select attempt video
  │   ├── Processing view
  │   └── Results (score, joint details, charts)
  └── Training History

Tab 4: Fuel
  ├── Daily summary + progress
  ├── Log Meal (manual or AI photo)
  │   └── Camera capture → AI analysis → confirm & save
  ├── Log Water (quick-add buttons: 8oz, 16oz, 24oz, custom)
  ├── Meal list (today + history)
  ├── Hydration log
  └── Dining Hall Menus (by college)

Tab 5: More
  ├── Academics
  │   ├── Items list (upcoming, overdue, completed)
  │   ├── Add/Edit item
  │   ├── Courses list
  │   └── Add/Edit course
  ├── Mobility
  │   ├── Exercise library (by body group)
  │   ├── Log exercise
  │   └── History
  └── Account
      ├── Profile editor
      ├── Goals editor
      ├── Notification preferences
      ├── Change password
      └── Logout
```

---

## 6. iOS-Specific Enhancements

These are new capabilities that the native platform enables. They don't exist in the web app.

### 6.1 Push Notifications
| Notification | Trigger | Priority |
|-------------|---------|----------|
| Hydration reminder | Every 2 hours between 8AM-8PM if below goal pace | P0 |
| Workout starting soon | 30 min before coach-assigned workout time | P0 |
| Academic deadline approaching | Morning of due date, evening before if incomplete | P1 |
| Daily check-in reminder | 8AM if not checked in | P1 |
| AI recommendation ready | After 5AM generation completes | P2 |
| Weekly summary | Sunday evening recap | P2 |

### 6.2 Quick Actions & Widgets

**Lock Screen / Home Screen Widgets** (WidgetKit):
- Hydration progress ring (small widget)
- Today's workout card (medium widget)
- Daily stats (calories + hydration + training, medium widget)

**Quick Actions** (3D Touch / long press app icon):
- "Log Water" → opens directly to hydration quick-add
- "Log Meal" → opens camera for food photo
- "Check In" → opens daily check-in

### 6.3 Camera Integration
- **Food photo analysis**: Native camera with overlay guide ("Center the food in frame"), instant Claude vision API call, review estimated macros before saving
- **Form analysis video**: Record video directly in-app (not just file picker), playback with pose overlay, side-by-side comparison view
- **Nutrition label scanner**: Dedicated mode that auto-crops to the label

### 6.4 Health App Integration (HealthKit)
- Sync hydration data to/from Apple Health
- Sync workout sessions (type, duration, calories burned)
- Read step count for daily activity context in AI recommendations
- Optional - user must grant permissions

### 6.5 Watch Companion (Phase 2)
- Quick water logging from wrist
- View today's workout
- Hydration progress complication

---

## 7. Data Model

No schema changes required. The existing 20+ PostgreSQL tables on Neon support all features:

**Core tables**: users, athlete_profiles, coach_athletes
**Training**: sessions, session_exercises, session_sets, training_templates, template_exercises, template_sets, template_schedules
**Coach plans**: weekly_plans, plan_days, plan_sessions, plan_session_groups, plan_exercises, plan_exercise_groups, assigned_workouts
**Groups**: athlete_groups, athlete_group_members
**Nutrition**: meal_logs, hydration_logs
**Recovery**: mobility_exercises, mobility_logs
**Wellness**: check_in_logs
**Academics**: courses, academic_items
**AI**: daily_recommendations, ai_usage_logs
**Form analysis**: form_reference_videos, form_analyses, form_analysis_results, form_joint_deviations

**New table needed**:
```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT DEFAULT 'ios',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);
```

---

## 8. API Changes Required

### 8.1 Auth Token in Response Body
Currently login/register only set an HTTP-only cookie. Add the token to the JSON response:

```
POST /api/auth/login
Response: { user: {...}, token: "eyJ..." }

POST /api/auth/register
Response: { user: {...}, token: "eyJ..." }
```

### 8.2 Bearer Token Support
Update `getCurrentUser()` in `lib/auth.ts` to check for:
1. `Authorization: Bearer <token>` header (iOS app)
2. `auth-token` cookie (web app, existing behavior)

### 8.3 New Endpoints
```
POST   /api/devices/register    - Register APNs device token
DELETE /api/devices/register    - Unregister on logout
POST   /api/notifications/send  - Internal: trigger push notification
```

### 8.4 No Other Changes
All 50+ existing API routes return JSON and accept JSON bodies. They work with any HTTP client as-is.

---

## 9. Development Phases

### Phase 1: Core Experience (MVP) - App Store Launch
**Goal**: Replace the web app for daily athlete use

- [ ] Xcode project setup, SwiftUI architecture, networking layer
- [ ] Auth: login, register, Keychain token storage, auto-refresh
- [ ] Home tab: dashboard, check-in, stats, upcoming items
- [ ] Fuel tab: meal logging (manual), hydration logging with quick-add, daily summary
- [ ] Training tab: view coach-assigned workouts, mark complete, view personal sessions
- [ ] Schedule tab: weekly calendar view
- [ ] Account: profile editor, goals, logout
- [ ] Backend: Bearer token auth support
- [ ] Offline data caching (read-only)
- [ ] App Store submission

### Phase 2: AI & Camera Features
**Goal**: Enable the smart features that differentiate Locker

- [ ] AI food photo analysis (camera → Claude vision → macros)
- [ ] AI daily recommendations display + on-demand generation
- [ ] Nutrition label scanning mode
- [ ] Yale dining hall menu browser
- [ ] Push notifications (hydration, workouts, academics)
- [ ] Device token registration

### Phase 3: Full Training Suite
**Goal**: Complete training parity with web

- [ ] Create/edit personal training sessions with exercises and sets
- [ ] Training templates with auto-scheduling
- [ ] Form analysis: video recording, MediaPipe iOS pose detection, results
- [ ] Training history and stats
- [ ] Offline write queue (sync meal/hydration/check-in logs when online)

### Phase 4: Academics, Mobility & Polish
**Goal**: Full feature parity + native enhancements

- [ ] Academics: courses, items, deadlines
- [ ] Mobility: exercise library, logging, history
- [ ] Home screen widgets (WidgetKit)
- [ ] Quick Actions (3D Touch)
- [ ] HealthKit integration
- [ ] Watch companion app (stretch)
- [ ] Dark/light theme matching system setting

---

## 10. App Store Requirements

| Requirement | Details |
|------------|---------|
| **Bundle ID** | com.locker.athlete |
| **Minimum iOS** | 17.0 (SwiftUI + SwiftData + Swift Charts maturity) |
| **App Category** | Health & Fitness |
| **Age Rating** | 4+ (no objectionable content) |
| **Privacy** | Camera (food/form analysis), Health (optional HealthKit), Notifications |
| **App Size Target** | < 50MB (MediaPipe model is ~4MB) |
| **Review Notes** | Demo account credentials for App Store reviewer |

### Privacy Nutrition Label (App Store)
- **Data collected**: Name, email, health/fitness data (meals, hydration, workouts, wellness scores), photos (food analysis only - not stored on device after upload)
- **Data linked to identity**: Yes (account-based)
- **Data used for tracking**: No
- **Third-party sharing**: Anthropic (AI analysis of food photos, anonymized prompts)

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active athletes | 80% of registered athletes | Analytics |
| Check-in completion rate | > 70% daily | Database query |
| Meals logged per athlete per day | >= 2 | Database query |
| Hydration logs per athlete per day | >= 3 | Database query |
| App Store rating | >= 4.5 stars | App Store Connect |
| Crash-free sessions | > 99.5% | Xcode Organizer |
| Time to log water | < 3 seconds (from app open) | UX testing |
| Coach workout completion rate | > 85% | Database query |

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| MediaPipe iOS SDK performance on older devices | Form analysis unusable | Set minimum iPhone 12, show warning on older devices, process fewer frames |
| Claude API costs scaling with food photo analysis | Unexpected bills | Daily per-user limit already exists (3/day), monitor via ai_usage_logs |
| Offline sync conflicts | Data loss or duplicates | Use server-generated UUIDs, last-write-wins for simple fields, queue operations |
| App Store rejection for health claims | Launch delay | Avoid medical language, position as "performance tracking" not "health advice" |
| Yale dining menu API changes | Feature breaks | API abstraction layer already exists, monitor for changes (already changed domain once) |
| Maintaining two clients (web + iOS) | Feature drift | Keep coach features web-only, athlete features iOS-primary, shared API |

---

## 13. Out of Scope

- Android app (future consideration)
- Coach features in the iOS app (coaches use web)
- Social features (athlete-to-athlete interaction)
- Payment/subscription (free for now)
- Custom exercise video library hosting
- Wearable device integrations beyond Apple Watch
- Real-time messaging between coach and athlete
