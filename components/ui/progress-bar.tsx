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

  const variantStyles = {
    default: "bg-foreground",
    primary: "gradient-primary glow-primary",
    success: "bg-success glow-success",
    warning: "bg-warning",
  }

  const sizeStyles = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && (
            <span className="font-medium text-foreground">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className={cn("w-full rounded-full bg-secondary overflow-hidden", sizeStyles[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", variantStyles[variant])}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  )
}
