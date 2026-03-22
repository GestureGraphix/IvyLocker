"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Dumbbell, Utensils, CalendarDays, GraduationCap, User } from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/fuel", label: "Fuel", icon: Utensils },
  { href: "/academics", label: "School", icon: GraduationCap },
  { href: "/account", label: "Account", icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "#162e22",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded min-w-[50px] transition-all"
              style={{ color: isActive ? "#c9a84c" : "rgba(255,255,255,0.45)" }}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5")} />
                {isActive && (
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "#c9a84c" }}
                  />
                )}
              </div>
              <span
                className="font-medium"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.5px",
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
