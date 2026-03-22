"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface ProgressBarProps {
  value: number
  max: number
  label?: string
  showValue?: boolean
  variant?: "default" | "primary" | "success" | "warning"
  size?: "sm" | "md" | "lg"
  className?: string
  animated?: boolean
}

export function ProgressBar({
  value,
  max,
  label,
  showValue = true,
  variant = "primary",
  size = "md",
  className,
  animated = true,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const percentage = Math.min((value / max) * 100, 100)

  useEffect(() => {
    if (animated) {
      const timeout = setTimeout(() => setDisplayValue(percentage), 100)
      return () => clearTimeout(timeout)
    } else {
      setDisplayValue(percentage)
    }
  }, [percentage, animated])

  const fillStyles = {
    default: { background: "var(--ink)" },
    primary: { background: "var(--ivy-mid)" },
    success: { background: "var(--ivy-light)" },
    warning: { background: "var(--gold)" },
  }

  const sizeStyles = {
    sm: "h-[2px]",
    md: "h-[3px]",
    lg: "h-[4px]",
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span
              className="uppercase tracking-wider text-muted-foreground"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px" }}
            >
              {label}
            </span>
          )}
          {showValue && (
            <span
              className="text-foreground"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px" }}
            >
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div
        className={cn("w-full rounded-sm overflow-hidden", sizeStyles[size])}
        style={{ background: "var(--cream-d)" }}
      >
        <div
          className="h-full rounded-sm transition-all duration-700 ease-out"
          style={{ width: `${displayValue}%`, ...fillStyles[variant] }}
        />
      </div>
    </div>
  )
}
