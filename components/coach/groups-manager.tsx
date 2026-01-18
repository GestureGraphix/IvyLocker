"use client"

import { useState } from "react"
import useSWR from "swr"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  UserPlus,
  ChevronRight,
  ArrowLeft,
} from "lucide-react"
import { CreateGroupDialog } from "./create-group-dialog"
import { ManageGroupMembersDialog } from "./manage-group-members-dialog"
import { toast } from "sonner"
import Link from "next/link"

interface Group {
  id: string
  name: string
  slug: string
  color: string
  description: string | null
  member_count: number
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function GroupsManager() {
  const [searchQuery, setSearchQuery] = useState("")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [manageMembersOpen, setManageMembersOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)

  const { data, error, isLoading, mutate } = useSWR<{ groups: Group[] }>(
    "/api/coach/groups",
    fetcher
  )

  const groups = data?.groups || []
  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalAthletes = groups.reduce((sum, g) => sum + g.member_count, 0)

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`Delete "${group.name}"? This will remove all athletes from this group.`)) {
      return
    }

    try {
      const res = await fetch(`/api/coach/groups/${group.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        toast.success("Group deleted")
        mutate()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete group")
      }
    } catch (error) {
      toast.error("Failed to delete group")
    }
  }

  const handleManageMembers = (group: Group) => {
    setSelectedGroup(group)
    setManageMembersOpen(true)
  }

  // Color options for groups
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/coach" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Athlete Groups
            </h1>
          </div>
          <p className="text-muted-foreground">
            Organize athletes into groups for easier workout assignment
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-primary">{groups.length}</div>
          <div className="text-sm text-muted-foreground">Groups</div>
        </GlassCard>
        <GlassCard className="text-center">
          <div className="text-3xl font-bold text-success">{totalAthletes}</div>
          <div className="text-sm text-muted-foreground">Athletes Assigned</div>
        </GlassCard>
        <GlassCard className="text-center hidden md:block">
          <div className="text-3xl font-bold text-warning">
            {groups.filter((g) => g.member_count === 0).length}
          </div>
          <div className="text-sm text-muted-foreground">Empty Groups</div>
        </GlassCard>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-secondary/50"
        />
      </div>

      {/* Groups List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <GlassCard key={i} className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-muted rounded" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : error ? (
        <GlassCard className="text-center py-8">
          <p className="text-destructive">Failed to load groups</p>
        </GlassCard>
      ) : filteredGroups.length === 0 && groups.length === 0 ? (
        <GlassCard className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
          <p className="text-muted-foreground mb-4">
            Create groups to organize athletes by event, position, or training focus
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Group
          </Button>
        </GlassCard>
      ) : filteredGroups.length === 0 ? (
        <GlassCard className="text-center py-8">
          <p className="text-muted-foreground">No groups match your search</p>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <GlassCard
              key={group.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => handleManageMembers(group)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: group.color }}
                  >
                    {group.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">{group.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingGroup(group)
                      setCreateDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteGroup(group)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {group.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {group.member_count} athlete{group.member_count !== 1 ? "s" : ""}
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  Manage
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setEditingGroup(null)
        }}
        editGroup={editingGroup}
        onSuccess={() => mutate()}
      />

      {selectedGroup && (
        <ManageGroupMembersDialog
          open={manageMembersOpen}
          onOpenChange={setManageMembersOpen}
          group={selectedGroup}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  )
}
