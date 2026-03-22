import type React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  glow?: "none" | "primary" | "accent" | "success"
}

export function GlassCard({ children, className, glow = "none", ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-6 shadow-sm transition-all duration-200",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
