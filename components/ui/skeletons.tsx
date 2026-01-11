"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { GlassCard } from "@/components/ui/glass-card"

export function StatCardSkeleton() {
  return (
    <GlassCard className="text-center">
      <Skeleton className="h-8 w-16 mx-auto mb-2" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </GlassCard>
  )
}

export function SessionCardSkeleton() {
  return (
    <GlassCard>
      <div className="flex items-start gap-4">
        <Skeleton className="h-6 w-6 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

export function MealCardSkeleton() {
  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </GlassCard>
  )
}

export function AthleteCardSkeleton() {
  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <Skeleton className="h-4 w-4 rounded mt-1" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-2">
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      </div>
    </GlassCard>
  )
}

export function CheckInWidgetSkeleton() {
  return (
    <GlassCard>
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-4">
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
        <div>
          <Skeleton className="h-4 w-28 mb-2" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
        <Skeleton className="h-10 w-full rounded" />
      </div>
    </GlassCard>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <CheckInWidgetSkeleton />
        <GlassCard>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

export function TrainingSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 max-w-md rounded" />
        <Skeleton className="h-10 w-24 rounded" />
      </div>

      <div className="space-y-4">
        <SessionCardSkeleton />
        <SessionCardSkeleton />
        <SessionCardSkeleton />
      </div>
    </div>
  )
}

export function CoachDashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1 max-w-md rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AthleteCardSkeleton />
        <AthleteCardSkeleton />
        <AthleteCardSkeleton />
      </div>
    </div>
  )
}
