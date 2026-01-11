# Product Requirements Document: Locker V2

## Overview

**Product Name:** Locker V2
**Type:** Athlete Performance & Wellness Dashboard
**Target Users:** Student-athletes and coaches
**Tech Stack:** Next.js 15, React 19, TypeScript, TailwindCSS, Prisma, PostgreSQL

Locker is a comprehensive personal performance dashboard for student-athletes. It centralizes training, nutrition, academics, recovery, and daily wellness tracking into a single platform with role-based access for athletes and coaches.

---

## Core Features to Implement

### 1. Authentication & User Management

**User Roles:**
- `ATHLETE` - Primary user tracking personal metrics
- `COACH` - Manages athletes, assigns workouts, views team data

**Auth Flow:**
- Email/password registration and login
- JWT-based session management with httpOnly cookies
- Guest mode with mock data for demo purposes
- Role-based navigation and permissions

**User Profile Fields:**
```typescript
interface AthleteProfile {
  sport: string
  level: string // "Varsity" | "Club" | "JV"
  team: string
  position: string
  heightCm: number
  weightKg: number
  phone: string
  location: string
  university: string
  graduationYear: number
  allergies: string[]
  tags: string[] // For coach team grouping
  nutritionGoals: {
    hydrationOz: number
    calories: number
    proteinGrams: number
  }
}
```

---

### 2. Dashboard (Home)

The central hub displaying today's status at a glance.

**Components:**
- **Daily Check-in Widget** - Mental state (1-10) + Physical state (1-10) with journal notes
- **Today's Progress Section:**
  - Hydration progress bar (current oz / goal oz)
  - Meals logged count with calorie/protein totals
  - Training sessions completed
- **Upcoming Items:**
  - Next 3 academic deadlines (assignments, exams)
  - Scheduled workouts/training sessions
- **Weekly Stats Summary** - Rolling 7-day metrics

---

### 3. Training Module

**Features:**
- Schedule and log workout sessions
- Track Personal Records (PRs)
- View assigned workouts from coaches
- Log session details: type, duration, intensity, focus area, notes

**Session Data Model:**
```typescript
interface Session {
  id: string
  type: string // "strength" | "conditioning" | "practice" | "competition"
  title: string
  startAt: Date
  endAt: Date
  intensity: "low" | "medium" | "high"
  focus: string
  notes: string
  completed: boolean
  assignedBy?: string // Coach ID if assigned
}
```

**Coach Capabilities:**
- Assign workouts to individual athletes or groups (by tags)
- Parse bulk schedule text into structured workouts
- View athlete completion status

---

### 4. Fuel (Nutrition) Module

**Meal Logging:**
- Log meals by type: breakfast, lunch, dinner, snack
- Track: calories, protein, carbs, fat, sodium, fiber
- Integration with Yale dining menu (NutriSlice API)
- Quick-add from dining hall menus with auto-populated nutrition data

**Hydration Tracking:**
- Log water intake by ounces
- Multiple entries per day with timestamps
- Progress toward daily goal
- Source tracking (water, sports drink, etc.)

**Data Models:**
```typescript
interface MealLog {
  id: string
  dateTime: Date
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  description: string
  calories: number
  proteinGrams: number
  nutritionFacts: {
    carbs: number
    fat: number
    sodium: number
    fiber: number
  }
}

interface HydrationLog {
  id: string
  date: Date
  time: string
  ounces: number
  source: string
}
```

---

### 5. Mobility & Recovery Module

**Exercise Library:**
- Pre-defined mobility exercises organized by body group
- Fields: name, body group, YouTube tutorial URL, prescription (sets/reps/duration)
- Custom exercise creation

**Body Groups:**
- Back, Hips, Shoulders, Ankles, Knees, Full Body

**Logging:**
- Log completed mobility sessions
- Track duration and notes
- View history by exercise or date

---

### 6. Academics Module

**Features:**
- Course management with schedule
- Assignment and exam tracking with due dates
- Priority levels: high, medium, low
- Completion status toggle
- ICS calendar import support

**Data Structure:**
```typescript
interface AcademicItem {
  id: string
  courseId: string
  courseName: string
  type: "assignment" | "exam" | "quiz" | "project"
  title: string
  dueDate: Date
  priority: "high" | "medium" | "low"
  completed: boolean
  notes: string
}
```

---

### 7. Account Settings

**Editable Fields:**
- Profile information (name, sport, team, position)
- Physical stats (height, weight)
- Contact info (phone, location)
- Nutrition goals (daily calories, protein, hydration)
- Allergy information

---

### 8. Coach Dashboard

**For users with COACH role:**
- View all athletes under management
- Filter athletes by team/tags
- Bulk assign workouts to groups
- View athlete check-in status and wellness trends
- Access individual athlete detailed views

---

## Navigation Structure

```
Sidebar (Desktop) / Bottom Sheet (Mobile)
├── Dashboard [/]
├── Training [/training]
├── Fuel [/fuel]
├── Mobility [/mobility]
├── Academics [/academics]
├── Account [/account]
└── Coach Portal [/coach] (conditional)
```

---

## API Endpoints Required

```
Authentication:
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/me

Athlete Data:
GET/PATCH /api/athletes/[id]
GET/POST  /api/athletes/[id]/meal-logs
DELETE    /api/athletes/[id]/meal-logs/[logId]
GET/POST  /api/athletes/[id]/hydration-logs
GET/POST  /api/athletes/[id]/sessions
PATCH/DELETE /api/athletes/[id]/sessions/[sessionId]
GET/POST  /api/athletes/[id]/check-in-logs
GET/POST  /api/athletes/[id]/mobility-exercises
GET/POST  /api/athletes/[id]/mobility-logs
GET/POST  /api/athletes/[id]/academics

External:
GET /api/yale-menu (NutriSlice proxy)
```

---

## V2 Design Requirements (CRITICAL)

### Problem with V1
The current UI is too bright, not sleek, and doesn't feel fun or engaging to use. The light blue gradient background with white glass cards creates a washed-out, clinical appearance.

### Design Direction for V2

**Color Palette - Dark Mode First:**
```css
/* Primary Background */
--bg-primary: #0a0a0f        /* Near black with slight blue */
--bg-secondary: #12121a      /* Elevated surfaces */
--bg-tertiary: #1a1a24       /* Cards, modals */

/* Accent Colors */
--accent-primary: #6366f1    /* Indigo - primary actions */
--accent-secondary: #8b5cf6  /* Purple - secondary elements */
--accent-success: #22c55e    /* Green - positive states */
--accent-warning: #f59e0b    /* Amber - warnings */
--accent-danger: #ef4444     /* Red - errors, destructive */

/* Gradients */
--gradient-primary: linear-gradient(135deg, #6366f1, #8b5cf6)
--gradient-glow: radial-gradient(circle, rgba(99,102,241,0.15), transparent)

/* Text */
--text-primary: #f8fafc      /* Primary text - near white */
--text-secondary: #94a3b8    /* Secondary text - muted */
--text-muted: #64748b        /* Tertiary text - very muted */

/* Borders */
--border-subtle: rgba(255,255,255,0.06)
--border-default: rgba(255,255,255,0.1)
```

**Visual Style:**
- **Dark, immersive interface** - feels like a premium sports/gaming app
- **Subtle glow effects** - accent colors with soft radial glows behind key elements
- **Glass morphism on dark** - `bg-white/5 backdrop-blur-xl border-white/10`
- **Gradient accents** - purple-to-indigo gradients for CTAs and highlights
- **Smooth micro-animations** - subtle hover states, loading skeletons, transitions
- **Depth through shadows** - layered cards with elevation
- **Neon-style highlights** - subtle colored borders/underlines on active states

**Component Styling:**

Cards:
```css
.card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
}
```

Buttons (Primary):
```css
.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;
}
.btn-primary:hover {
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
  transform: translateY(-1px);
}
```

Inputs:
```css
.input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #f8fafc;
}
.input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}
```

Progress Bars:
```css
.progress-bar {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999px;
}
.progress-fill {
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}
```

**Typography:**
- Font: Inter or Geist Sans (clean, modern)
- Large, bold headings with gradient text for emphasis
- Generous spacing and line-height for readability

**Iconography:**
- Lucide icons or Phosphor icons
- Consistent 20-24px size in UI
- Slight opacity reduction for secondary icons

**Animations:**
- Page transitions: fade + slight slide up
- Card hover: subtle lift with shadow increase
- Button press: scale down slightly
- Loading states: skeleton shimmer with dark gradient
- Number changes: count-up animation

**Layout:**
- Generous padding (24-32px on desktop)
- Card grid with consistent gaps (16-24px)
- Sticky header with blur effect
- Sidebar: dark with active state glow indicator

---

## Mobile Considerations

- Bottom navigation bar (not sheet drawer)
- Touch-friendly tap targets (min 44px)
- Swipe gestures for common actions
- Pull-to-refresh on data lists
- Haptic feedback on key interactions (if supported)

---

## Component Library Requirements

Build these reusable components:

1. **Card** - Dark glass card with optional glow accent
2. **Button** - Primary, secondary, ghost, danger variants
3. **Input** - Text, number, date, select, textarea
4. **Badge** - Status indicators with color variants
5. **Progress** - Linear and circular progress indicators
6. **Avatar** - User avatar with status indicator
7. **Tabs** - Segmented navigation with animated indicator
8. **Dialog/Modal** - Overlay with dark backdrop blur
9. **Sheet** - Bottom sheet for mobile actions
10. **Table** - Data table with sorting, dark styled
11. **Stat Card** - Icon + value + label + trend indicator
12. **Calendar** - Date picker with dark theme
13. **Toast** - Notification popups
14. **Skeleton** - Loading placeholder with shimmer

---

## Data Visualization

For stats and trends, implement:
- **Line charts** - Weekly trends (check-in states, hydration)
- **Bar charts** - Daily comparisons (calories, sessions)
- **Radial progress** - Goal completion (hydration, macros)
- Use a library like Recharts with custom dark theme

---

## Priority Order for Implementation

1. **Auth + Layout Shell** - Login, register, sidebar, navigation
2. **Dashboard** - Home view with check-in and today's progress
3. **Training Module** - Session logging and viewing
4. **Fuel Module** - Meal and hydration logging
5. **Academics** - Course and assignment tracking
6. **Mobility** - Exercise library and logging
7. **Account Settings** - Profile management
8. **Coach Portal** - Team management features

---

## Technical Notes for V0

- Use Next.js App Router with server components where appropriate
- Implement with TypeScript strict mode
- Use Tailwind CSS for all styling (no separate CSS files)
- Prefer Radix UI primitives for accessible components
- Use React Hook Form + Zod for form validation
- Implement optimistic updates for better UX
- Use SWR or TanStack Query for data fetching
- Store auth in httpOnly cookies, not localStorage

---

## Success Metrics

- UI feels premium, modern, and engaging
- Dark theme reduces eye strain for evening use
- Navigation is intuitive and fast
- Data entry is quick with smart defaults
- Loading states are smooth, never jarring
- Mobile experience is native-app quality
