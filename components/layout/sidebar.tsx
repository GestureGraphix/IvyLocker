"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Activity,
  GraduationCap,
  User,
  Users,
  LogOut,
  CalendarDays,
  Stethoscope,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const performanceItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/fuel", label: "Fuel", icon: Utensils },
  { href: "/mobility", label: "Physio", icon: Activity },
]

const academicsItems = [
  { href: "/academics", label: "Academics", icon: GraduationCap },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
]

const accountItems = [{ href: "/account", label: "Account", icon: User }]
const coachItem = { href: "/coach", label: "Coach Portal", icon: Users }
const physioItem = { href: "/physio", label: "Physio Portal", icon: Stethoscope }

interface SidebarProps {
  userRole?: "ATHLETE" | "COACH" | "PHYSIO"
  userName?: string
}

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string
  items: { href: string; label: string; icon: React.ElementType }[]
  pathname: string
}) {
  return (
    <div className="mb-1">
      <p
        className="px-[18px] pt-3 pb-1 uppercase"
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "8px",
          letterSpacing: "2px",
          color: "rgba(255,255,255,0.18)",
        }}
      >
        {label}
      </p>
      {items.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-[9px] px-[18px] py-2 text-[12px] border-l-2 transition-all duration-[180ms]"
            style={{
              color: isActive ? "#f7f2ea" : "rgba(255,255,255,0.38)",
              background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
              borderLeftColor: isActive ? "var(--uni-accent)" : "transparent",
              fontWeight: isActive ? 500 : 400,
              letterSpacing: "0.2px",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.70)"
                e.currentTarget.style.background = "rgba(255,255,255,0.03)"
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = "rgba(255,255,255,0.38)"
                e.currentTarget.style.background = "transparent"
              }
            }}
          >
            <Icon
              className="shrink-0"
              style={{
                width: "14px",
                height: "14px",
                opacity: isActive ? 1 : 0.7,
              }}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const displayName = userName || user?.name || "Athlete"
  const displayRole = userRole || user?.role || "ATHLETE"
  const isCoach = displayRole === "COACH"
  const isPhysio = displayRole === "PHYSIO"

  const nameParts = displayName.trim().split(" ")
  const surname = nameParts[nameParts.length - 1].toUpperCase()
  const firstName = nameParts[0]

  const allAccountItems = isCoach
    ? [...accountItems, coachItem]
    : isPhysio
    ? [...accountItems, physioItem]
    : accountItems

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen flex flex-col overflow-hidden"
      style={{
        width: "200px",
        background: "var(--uni-primary)",
        backgroundImage:
          "repeating-linear-gradient(-55deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
        transition: "background 0.3s ease",
      }}
    >
      {/* Wordmark */}
      <div
        className="px-[18px] py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/" className="block">
          <span
            className="block leading-none"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "16px",
              letterSpacing: "4px",
              color: "#f7f2ea",
            }}
          >
            LOCKEROOM
          </span>
          <span
            className="block mt-0.5"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: isCoach ? "#7dd3fc" : isPhysio ? "#a78bfa" : "var(--uni-accent)",
            }}
          >
            {isCoach ? "Coach" : isPhysio ? "Physio" : "Athlete"}
          </span>
        </Link>
      </div>

      {/* Identity block */}
      <div
        className="relative px-[18px] py-4 overflow-hidden flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Ghost number */}
        <span
          aria-hidden
          className="absolute right-2.5 top-2 select-none pointer-events-none leading-none"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "64px",
            color: "rgba(255,255,255,0.06)",
            letterSpacing: "-2px",
          }}
        >
          {user?.jersey_number ?? "—"}
        </span>

        <p
          className="relative leading-tight"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "18px",
            letterSpacing: "1.5px",
            color: "#f7f2ea",
          }}
        >
          {surname}
        </p>
        <p
          className="relative mt-0.5"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.35)",
          }}
        >
          {firstName}
        </p>

        <div className="relative mt-2.5">
          <p
            className="mb-1"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.20)",
            }}
          >
            Wellness
          </p>
          <div
            className="h-[2px] rounded-sm overflow-hidden"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <div
              className="h-full rounded-sm"
              style={{ width: "72%", background: "var(--uni-accent)" }}
            />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: "none" }}>
        {isCoach ? (
          <NavSection label="Portal" items={[coachItem]} pathname={pathname} />
        ) : (
          <>
            <NavSection label="Performance" items={performanceItems} pathname={pathname} />
            <NavSection label="Academics" items={academicsItems} pathname={pathname} />
            <NavSection label="Account" items={allAccountItems} pathname={pathname} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        className="p-3 flex-shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {(isCoach || isPhysio) && (
          <div
            className="flex rounded overflow-hidden mb-2"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {([
              { label: "Athlete", href: "/", active: !isCoach && !isPhysio },
              { label: "Coach",   href: "/coach", active: isCoach },
              { label: "Physio",  href: "/physio", active: isPhysio },
            ] as const).map(({ label, href, active }) => (
              <Link
                key={label}
                href={href}
                className="flex-1 py-1.5 text-center transition-colors"
                style={{
                  background: active ? "rgba(255,255,255,0.10)" : "transparent",
                  color: active ? "#f7f2ea" : "rgba(255,255,255,0.25)",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.55)" }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = "rgba(255,255,255,0.25)" }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-[11px]"
          style={{ color: "rgba(255,255,255,0.25)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
