"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExerciseLibrary } from "./exercise-library"
import { MobilityHistory } from "./mobility-history"
import { LogMobilityDialog } from "./log-mobility-dialog"
import { Plus, Activity, Calendar, Clock, Target } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Demo exercises library
const demoExercises = [
  {
    id: "1",
    name: "Cat-Cow Stretch",
    body_group: "Back",
    youtube_url: "https://youtube.com/watch?v=example1",
    sets: 1,
    reps: 10,
    duration_seconds: null,
  },
  {
    id: "2",
    name: "Hip Flexor Stretch",
    body_group: "Hips",
    youtube_url: "https://youtube.com/watch?v=example2",
    sets: 2,
    reps: null,
    duration_seconds: 30,
  },
  {
    id: "3",
    name: "Shoulder Circles",
    body_group: "Shoulders",
    youtube_url: "https://youtube.com/watch?v=example3",
    sets: 2,
    reps: 15,
    duration_seconds: null,
  },
  {
    id: "4",
    name: "Ankle Rotations",
    body_group: "Ankles",
    youtube_url: null,
    sets: 2,
    reps: 10,
    duration_seconds: null,
  },
  {
    id: "5",
    name: "World's Greatest Stretch",
    body_group: "Full Body",
    youtube_url: "https://youtube.com/watch?v=example5",
    sets: 2,
    reps: 5,
    duration_seconds: null,
  },
  {
    id: "6",
    name: "Pigeon Pose",
    body_group: "Hips",
    youtube_url: "https://youtube.com/watch?v=example6",
    sets: 1,
    reps: null,
    duration_seconds: 60,
  },
  {
    id: "7",
    name: "Thread the Needle",
    body_group: "Back",
    youtube_url: "https://youtube.com/watch?v=example7",
    sets: 2,
    reps: 8,
    duration_seconds: null,
  },
  {
    id: "8",
    name: "Wall Angels",
    body_group: "Shoulders",
    youtube_url: "https://youtube.com/watch?v=example8",
    sets: 2,
    reps: 12,
    duration_seconds: null,
  },
]

// Demo mobility logs
const demoLogs = [
  {
    id: "1",
    exercise_id: "1",
    exercise_name: "Cat-Cow Stretch",
    body_group: "Back",
    date: new Date().toISOString().split("T")[0],
    duration_minutes: 5,
    notes: "Felt good, back was tight",
  },
  {
    id: "2",
    exercise_id: "2",
    exercise_name: "Hip Flexor Stretch",
    body_group: "Hips",
    date: new Date().toISOString().split("T")[0],
    duration_minutes: 8,
    notes: "",
  },
  {
    id: "3",
    exercise_id: "5",
    exercise_name: "World's Greatest Stretch",
    body_group: "Full Body",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    duration_minutes: 10,
    notes: "Full body routine",
  },
]

export function MobilityContent() {
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<(typeof demoExercises)[0] | null>(null)

  const { data: exercisesData, mutate: mutateExercises } = useSWR("/api/athletes/mobility-exercises", fetcher, {
    fallbackData: { exercises: demoExercises },
  })

  const { data: logsData, mutate: mutateLogs } = useSWR("/api/athletes/mobility-logs", fetcher, {
    fallbackData: { logs: demoLogs },
  })

  const exercises = exercisesData?.exercises || demoExercises
  const logs = logsData?.logs || demoLogs

  // Stats
  const today = new Date().toISOString().split("T")[0]
  const todayLogs = logs.filter((log: { date: string }) => log.date === today)
  const todayMinutes = todayLogs.reduce(
    (acc: number, log: { duration_minutes: number }) => acc + log.duration_minutes,
    0,
  )

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = logs.filter((log: { date: string }) => new Date(log.date) >= weekAgo)
  const weekMinutes = weekLogs.reduce((acc: number, log: { duration_minutes: number }) => acc + log.duration_minutes, 0)

  const bodyGroups = [...new Set(logs.map((log: { body_group: string }) => log.body_group))]

  const handleLogExercise = (exercise: (typeof demoExercises)[0]) => {
    setSelectedExercise(exercise)
    setIsLogDialogOpen(true)
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-7 w-7 text-accent" />
            Mobility & Recovery
          </h1>
          <p className="text-muted-foreground">Track your stretching and mobility work</p>
        </div>
        <Button
          onClick={() => {
            setSelectedExercise(null)
            setIsLogDialogOpen(true)
          }}
          className="gradient-primary glow-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Log Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayMinutes}</p>
              <p className="text-sm text-muted-foreground">Minutes Today</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{weekMinutes}</p>
              <p className="text-sm text-muted-foreground">Minutes This Week</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{bodyGroups.length}</p>
              <p className="text-sm text-muted-foreground">Body Groups</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="library" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="library">Exercise Library</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <ExerciseLibrary exercises={exercises} onLogExercise={handleLogExercise} onUpdate={() => mutateExercises()} />
        </TabsContent>

        <TabsContent value="history">
          <MobilityHistory logs={logs} onUpdate={() => mutateLogs()} />
        </TabsContent>
      </Tabs>

      <LogMobilityDialog
        open={isLogDialogOpen}
        onOpenChange={setIsLogDialogOpen}
        onSuccess={() => mutateLogs()}
        exercises={exercises}
        selectedExercise={selectedExercise}
      />
    </div>
  )
}
