"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AcademicItemList } from "./academic-item-list"
import { CourseList } from "./course-list"
import { AddAcademicItemDialog } from "./add-academic-item-dialog"
import { AddCourseDialog } from "./add-course-dialog"
import { Plus, GraduationCap, BookOpen, Calendar, AlertCircle, CheckCircle } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Demo data
const demoCourses = [
  { id: "1", name: "Physics 201", code: "PHYS 201", instructor: "Dr. Smith", schedule: "MWF 10:00 AM" },
  { id: "2", name: "English 110", code: "ENG 110", instructor: "Prof. Johnson", schedule: "TTh 2:00 PM" },
  { id: "3", name: "Mathematics 115", code: "MATH 115", instructor: "Dr. Williams", schedule: "MWF 11:00 AM" },
]

const demoAcademicItems = [
  {
    id: "1",
    course_id: "1",
    course_name: "Physics 201",
    type: "assignment",
    title: "Problem Set 5",
    due_date: new Date(Date.now() + 86400000).toISOString(),
    priority: "high",
    completed: false,
    notes: "Chapters 7-8",
  },
  {
    id: "2",
    course_id: "2",
    course_name: "English 110",
    type: "assignment",
    title: "Essay Draft",
    due_date: new Date(Date.now() + 3 * 86400000).toISOString(),
    priority: "medium",
    completed: false,
    notes: "1500-2000 words",
  },
  {
    id: "3",
    course_id: "3",
    course_name: "Mathematics 115",
    type: "exam",
    title: "Midterm Exam",
    due_date: new Date(Date.now() + 6 * 86400000).toISOString(),
    priority: "high",
    completed: false,
    notes: "Covers chapters 1-6",
  },
  {
    id: "4",
    course_id: "1",
    course_name: "Physics 201",
    type: "quiz",
    title: "Quiz 3",
    due_date: new Date(Date.now() - 86400000).toISOString(),
    priority: "medium",
    completed: true,
    notes: "",
  },
]

export function AcademicsContent() {
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false)

  const { data: coursesData, mutate: mutateCourses } = useSWR("/api/athletes/courses", fetcher, {
    fallbackData: { courses: demoCourses },
  })

  const { data: itemsData, mutate: mutateItems } = useSWR("/api/athletes/academics", fetcher, {
    fallbackData: { items: demoAcademicItems },
  })

  const courses = coursesData?.courses || demoCourses
  const items = itemsData?.items || demoAcademicItems

  // Stats
  const upcomingItems = items.filter(
    (item: { completed: boolean; due_date: string }) => !item.completed && new Date(item.due_date) > new Date(),
  )
  const overdueItems = items.filter(
    (item: { completed: boolean; due_date: string }) => !item.completed && new Date(item.due_date) < new Date(),
  )
  const completedItems = items.filter((item: { completed: boolean }) => item.completed)

  const highPriorityCount = upcomingItems.filter((item: { priority: string }) => item.priority === "high").length

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Academics
          </h1>
          <p className="text-muted-foreground">Track your courses, assignments, and exams</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCourseDialogOpen(true)} variant="outline" className="border-primary/50">
            <BookOpen className="h-4 w-4 mr-2 text-primary" />
            Add Course
          </Button>
          <Button onClick={() => setIsItemDialogOpen(true)} className="gradient-primary glow-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{upcomingItems.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overdueItems.length}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/20">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{highPriorityCount}</p>
              <p className="text-sm text-muted-foreground">High Priority</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedItems.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Overdue Alert */}
      {overdueItems.length > 0 && (
        <GlassCard className="border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-foreground">You have {overdueItems.length} overdue item(s)</p>
              <p className="text-sm text-muted-foreground">
                {overdueItems.map((item: { title: string }) => item.title).join(", ")}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Tabs */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="items">Assignments & Exams</TabsTrigger>
          <TabsTrigger value="courses">
            Courses
            <Badge variant="secondary" className="ml-2">
              {courses.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <AcademicItemList items={items} onUpdate={() => mutateItems()} />
        </TabsContent>

        <TabsContent value="courses">
          <CourseList courses={courses} onUpdate={() => mutateCourses()} />
        </TabsContent>
      </Tabs>

      <AddAcademicItemDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        onSuccess={() => mutateItems()}
        courses={courses}
      />
      <AddCourseDialog
        open={isCourseDialogOpen}
        onOpenChange={setIsCourseDialogOpen}
        onSuccess={() => mutateCourses()}
      />
    </div>
  )
}
