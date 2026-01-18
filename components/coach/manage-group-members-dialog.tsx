"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Search,
  UserPlus,
  UserMinus,
  Users,
  X,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Group {
  id: string
  name: string
  slug: string
  color: string
}

interface Athlete {
  id: string
  name: string
  email: string
  sport?: string
  position?: string
  groups?: { id: string; name: string; color: string }[]
  added_at?: string
}

interface ManageGroupMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
  onSuccess: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ManageGroupMembersDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: ManageGroupMembersDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [selectedToRemove, setSelectedToRemove] = useState<string[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [activeTab, setActiveTab] = useState("members")

  // Fetch current members
  const {
    data: membersData,
    mutate: mutateMembers,
    isLoading: membersLoading,
  } = useSWR<{ members: Athlete[] }>(
    open ? `/api/coach/groups/${group.id}/members` : null,
    fetcher
  )

  // Fetch available athletes (not in this group)
  const { data: availableData, isLoading: availableLoading } = useSWR<{
    athletes: Athlete[]
  }>(
    open ? `/api/coach/athletes?notInGroup=${group.id}` : null,
    fetcher
  )

  const members = membersData?.members || []
  const availableAthletes = availableData?.athletes || []

  // Filter by search
  const filteredMembers = members.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredAvailable = availableAthletes.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Reset selections when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedToAdd([])
      setSelectedToRemove([])
      setSearchQuery("")
      setActiveTab("members")
    }
  }, [open])

  const handleAddAthletes = async () => {
    if (selectedToAdd.length === 0) return

    setIsAdding(true)
    try {
      const res = await fetch(`/api/coach/groups/${group.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteIds: selectedToAdd }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || "Athletes added")
        setSelectedToAdd([])
        mutateMembers()
        onSuccess()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to add athletes")
      }
    } catch (error) {
      toast.error("Failed to add athletes")
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveAthletes = async () => {
    if (selectedToRemove.length === 0) return

    setIsRemoving(true)
    try {
      const res = await fetch(`/api/coach/groups/${group.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteIds: selectedToRemove }),
      })

      if (res.ok) {
        toast.success("Athletes removed")
        setSelectedToRemove([])
        mutateMembers()
        onSuccess()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to remove athletes")
      }
    } catch (error) {
      toast.error("Failed to remove athletes")
    } finally {
      setIsRemoving(false)
    }
  }

  const toggleAddSelection = (id: string) => {
    setSelectedToAdd((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleRemoveSelection = (id: string) => {
    setSelectedToRemove((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: group.color }}
            >
              {group.name.charAt(0)}
            </div>
            {group.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="add">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Athletes
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50"
            />
          </div>

          {/* Members Tab */}
          <TabsContent value="members" className="flex-1 min-h-0 flex flex-col mt-4">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {members.length === 0
                  ? "No athletes in this group yet"
                  : "No athletes match your search"}
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-2">
                    {filteredMembers.map((athlete) => (
                      <div
                        key={athlete.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          selectedToRemove.includes(athlete.id)
                            ? "border-destructive/50 bg-destructive/10"
                            : "border-border/50 bg-secondary/30"
                        )}
                      >
                        <Checkbox
                          checked={selectedToRemove.includes(athlete.id)}
                          onCheckedChange={() => toggleRemoveSelection(athlete.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {athlete.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {athlete.email}
                          </p>
                        </div>
                        {athlete.position && (
                          <Badge variant="outline" className="shrink-0">
                            {athlete.position}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedToRemove.length > 0 && (
                  <div className="pt-4 border-t mt-4">
                    <Button
                      onClick={handleRemoveAthletes}
                      disabled={isRemoving}
                      variant="destructive"
                      className="w-full"
                    >
                      {isRemoving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove {selectedToRemove.length} Athlete
                          {selectedToRemove.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Add Athletes Tab */}
          <TabsContent value="add" className="flex-1 min-h-0 flex flex-col mt-4">
            {availableLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="text-center py-8">
                {availableAthletes.length === 0 && members.length === 0 ? (
                  <div className="space-y-3">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      You need to add athletes to your roster first
                    </p>
                    <Link href="/coach">
                      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Go to Coach Portal
                      </Button>
                    </Link>
                  </div>
                ) : availableAthletes.length === 0 ? (
                  <p className="text-muted-foreground">
                    All your athletes are already in this group
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No athletes match your search
                  </p>
                )}
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-2">
                    {filteredAvailable.map((athlete) => (
                      <div
                        key={athlete.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          selectedToAdd.includes(athlete.id)
                            ? "border-primary/50 bg-primary/10"
                            : "border-border/50 bg-secondary/30"
                        )}
                      >
                        <Checkbox
                          checked={selectedToAdd.includes(athlete.id)}
                          onCheckedChange={() => toggleAddSelection(athlete.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {athlete.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {athlete.email}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {athlete.groups?.slice(0, 2).map((g) => (
                            <div
                              key={g.id}
                              className="h-5 w-5 rounded text-[10px] text-white flex items-center justify-center font-medium"
                              style={{ backgroundColor: g.color }}
                              title={g.name}
                            >
                              {g.name.charAt(0)}
                            </div>
                          ))}
                          {(athlete.groups?.length || 0) > 2 && (
                            <div className="h-5 px-1 rounded bg-muted text-[10px] flex items-center justify-center">
                              +{(athlete.groups?.length || 0) - 2}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedToAdd.length > 0 && (
                  <div className="pt-4 border-t mt-4">
                    <Button
                      onClick={handleAddAthletes}
                      disabled={isAdding}
                      className="w-full gradient-primary"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add {selectedToAdd.length} Athlete
                          {selectedToAdd.length !== 1 ? "s" : ""}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
