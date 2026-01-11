"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Activity,
  GraduationCap,
  User,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/fuel", label: "Fuel", icon: Utensils },
  { href: "/mobility", label: "Mobility", icon: Activity },
  { href: "/academics", label: "Academics", icon: GraduationCap },
  { href: "/account", label: "Account", icon: User },
]

const coachNavItem = { href: "/coach", label: "Coach Portal", icon: Users }

interface SidebarProps {
  userRole?: "ATHLETE" | "COACH"
  userName?: string
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()

  const displayName = userName || user?.name || "Athlete"
  const displayRole = userRole || user?.role || "ATHLETE"
  const allNavItems = displayRole === "COACH" ? [...navItems, coachNavItem] : navItems

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center glow-primary">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-lg font-bold gradient-text">Locker</span>
          </Link>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center mx-auto glow-primary">
            <span className="text-white font-bold text-sm">L</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn("p-1.5 rounded-md hover:bg-sidebar-accent transition-colors", collapsed && "mx-auto mt-2")}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {allNavItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full gradient-primary glow-primary" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive ? "text-primary" : "group-hover:text-primary",
                )}
              />
              {!collapsed && <span className={cn("font-medium", isActive && "text-foreground")}>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
            <span className="text-white font-semibold text-sm">{displayName.charAt(0).toUpperCase()}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayRole}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={logout} className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors">
              <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
