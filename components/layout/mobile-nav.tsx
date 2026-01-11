"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Dumbbell, Utensils, Activity, GraduationCap } from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/fuel", label: "Fuel", icon: Utensils },
  { href: "/mobility", label: "Mobility", icon: Activity },
  { href: "/academics", label: "Academics", icon: GraduationCap },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-xl border-t border-sidebar-border md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px]",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_var(--primary)]")} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
