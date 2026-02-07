"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, MoreVertical, Pencil, Trash2, BookOpen, FileText, GraduationCap, ClipboardList } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditAcademicItemDialog } from "./edit-academic-item-dialog"

interface AcademicItem {
  id: string
  course_id: string
  course_name: string
  type: string
  title: string
  due_date: string
  priority: string
  completed: boolean
  notes: string
}

interface Course {
  id: string
  name: string
  code: string
}

interface AcademicItemListProps {
  items: AcademicItem[]
  courses: Course[]
  onUpdate: () => void
}

const typeIcons = {
  assignment: FileText,
  exam: GraduationCap,
  quiz: ClipboardList,
  project: BookOpen,
}

const priorityColors = {
  high: "border-destructive text-destructive",
  medium: "border-warning text-warning",
  low: "border-success text-success",
}

export function AcademicItemList({ items, courses, onUpdate }: AcademicItemListProps) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("upcoming")
  const [editingItem, setEditingItem] = useState<AcademicItem | null>(null)

  const filteredItems = items.filter((item) => {
    if (filter === "completed") return item.completed
    if (filter === "upcoming") return !item.completed
    return true
  })

  // Sort by due date
  const sortedItems = [...filteredItems].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  const handleToggleComplete = async (item: AcademicItem) => {
    try {
      await fetch(`/api/athletes/academics/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completed }),
      })
      onUpdate()
    } catch (error) {
      console.error("Failed to update item:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return

    try {
      await fetch(`/api/athletes/academics/${id}`, { method: "DELETE" })
      onUpdate()
    } catch (error) {
      console.error("Failed to delete item:", error)
    }
  }

  const getDueLabel = (dateStr: string) => {
    const due = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { label: `${Math.abs(diffDays)} days overdue`, isOverdue: true }
    if (diffDays === 0) return { label: "Due today", isOverdue: false }
    if (diffDays === 1) return { label: "Due tomorrow", isOverdue: false }
    if (diffDays <= 7) return { label: `Due in ${diffDays} days`, isOverdue: false }
    return {
      label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isOverdue: false,
    }
  }

  if (items.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No academic items</h3>
        <p className="text-muted-foreground">Add your first assignment or exam to get started</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["upcoming", "completed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize",
              filter === f
                ? "gradient-primary text-white glow-primary"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {sortedItems.map((item) => {
          const Icon = typeIcons[item.type as keyof typeof typeIcons] || FileText
          const dueInfo = getDueLabel(item.due_date)

          return (
            <GlassCard key={item.id} className={cn("transition-all", item.completed && "opacity-60")}>
              <div className="flex items-start gap-4">
                {/* Complete checkbox */}
                <button
                  onClick={() => handleToggleComplete(item)}
                  className={cn(
                    "mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                    item.completed
                      ? "bg-success border-success text-white"
                      : "border-muted-foreground hover:border-primary",
                  )}
                >
                  {item.completed && <Check className="h-4 w-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h3
                      className={cn(
                        "font-semibold text-foreground",
                        item.completed && "line-through text-muted-foreground",
                      )}
                    >
                      {item.title}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {item.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        priorityColors[item.priority as keyof typeof priorityColors] || priorityColors.medium,
                      )}
                    >
                      {item.priority}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{item.course_name}</span>
                    <span className={cn(dueInfo.isOverdue && "text-destructive font-medium")}>{dueInfo.label}</span>
                  </div>

                  {item.notes && <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingItem(item)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </GlassCard>
          )
        })}

        {sortedItems.length === 0 && (
          <GlassCard className="text-center py-8">
            <p className="text-muted-foreground">
              {filter === "upcoming" ? "No upcoming items" : filter === "completed" ? "No completed items" : "No items"}
            </p>
          </GlassCard>
        )}
      </div>

      <EditAcademicItemDialog
        open={editingItem !== null}
        onOpenChange={(open) => { if (!open) setEditingItem(null) }}
        onSuccess={onUpdate}
        courses={courses}
        item={editingItem}
      />
    </div>
  )
}
