import { cn } from "@/lib/utils"
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "primary" | "success" | "warning"
  className?: string
}

export function StatCard({ label, value, icon: Icon, trend, variant = "default", className }: StatCardProps) {
  const accentColor = {
    default: "var(--soft)",
    primary: "var(--ivy)",
    success: "var(--ivy-mid)",
    warning: "var(--gold)",
  }[variant]

  return (
    <div
      className={cn(
        "bg-white border border-rule rounded-lg overflow-hidden",
        className,
      )}
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p
              className="uppercase text-muted-foreground truncate"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px" }}
            >
              {label}
            </p>
            <p
              className="text-foreground leading-none"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", letterSpacing: "0.5px" }}
            >
              {value}
            </p>
          </div>
          {Icon && (
            <Icon className="h-4 w-4 shrink-0 mt-0.5 opacity-40" style={{ color: accentColor }} />
          )}
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1">
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span
              className={cn("font-medium", trend.isPositive ? "text-success" : "text-destructive")}
              style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px" }}
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
