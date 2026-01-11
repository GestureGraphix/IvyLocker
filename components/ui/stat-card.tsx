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
  const variantStyles = {
    default: "bg-card border-border",
    primary: "bg-primary/10 border-primary/20",
    success: "bg-success/10 border-success/20",
    warning: "bg-warning/10 border-warning/20",
  }

  const iconStyles = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200 hover:shadow-lg",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {Icon && (
          <div className={cn("p-2 rounded-lg bg-secondary", iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          {trend.isPositive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          <span className={cn("text-sm font-medium", trend.isPositive ? "text-success" : "text-destructive")}>
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-sm text-muted-foreground">vs last week</span>
        </div>
      )}
    </div>
  )
}
