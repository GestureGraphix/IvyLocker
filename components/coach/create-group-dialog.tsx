"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Group {
  id: string
  name: string
  slug: string
  color: string
  description: string | null
}

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editGroup?: Group | null
  onSuccess: () => void
}

const colorOptions = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
]

export function CreateGroupDialog({
  open,
  onOpenChange,
  editGroup,
  onSuccess,
}: CreateGroupDialogProps) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Reset form when dialog opens/closes or editGroup changes
  useEffect(() => {
    if (open) {
      if (editGroup) {
        setName(editGroup.name)
        setSlug(editGroup.slug)
        setColor(editGroup.color)
        setDescription(editGroup.description || "")
        setSlugManuallyEdited(true)
      } else {
        setName("")
        setSlug("")
        setColor("#6366f1")
        setDescription("")
        setSlugManuallyEdited(false)
      }
    }
  }, [open, editGroup])

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      setSlug(generatedSlug)
    }
  }, [name, slugManuallyEdited])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required")
      return
    }

    setIsSubmitting(true)

    try {
      const url = editGroup
        ? `/api/coach/groups/${editGroup.id}`
        : "/api/coach/groups"
      const method = editGroup ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          color,
          description: description.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success(editGroup ? "Group updated" : "Group created")
        onSuccess()
        onOpenChange(false)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to save group")
      }
    } catch (error) {
      toast.error("Failed to save group")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {editGroup ? "Edit Group" : "Create Group"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              placeholder="e.g., Short Sprints"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identifier)</Label>
            <Input
              id="slug"
              placeholder="e.g., sprints-short"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                setSlugManuallyEdited(true)
              }}
              className="bg-secondary/50 border-border/50"
            />
            <p className="text-xs text-muted-foreground">
              Used in workout plans (e.g., "SS: 5x150m")
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setColor(opt.value)}
                  className={cn(
                    "h-8 w-8 rounded-lg transition-all",
                    color === opt.value
                      ? "ring-2 ring-offset-2 ring-offset-background ring-primary"
                      : "hover:scale-110"
                  )}
                  style={{ backgroundColor: opt.value }}
                  title={opt.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="e.g., 100m and 200m specialists"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-secondary/50 border-border/50 resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 gradient-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editGroup ? (
                "Update Group"
              ) : (
                "Create Group"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
