import type React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  glow?: "none" | "primary" | "accent" | "success"
}

export function GlassCard({ children, className, glow = "none", ...props }: GlassCardProps) {
  const glowStyles = {
    none: "",
    primary: "shadow-[0_0_30px_-10px_var(--glow-primary)]",
    accent: "shadow-[0_0_30px_-10px_var(--glow-accent)]",
    success: "shadow-[0_0_30px_-10px_var(--glow-success)]",
  }

  return (
    <div
      className={cn("glass-card rounded-xl p-6 transition-all duration-200", glowStyles[glow], className)}
      {...props}
    >
      {children}
    </div>
  )
}
