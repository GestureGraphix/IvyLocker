"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FolderOpen, FileText, LogOut } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

const NAV_ITEMS: { href: string; label: string; Icon: React.ElementType }[] = [
  { href: "/coach",        label: "Dashboard", Icon: LayoutDashboard },
  { href: "/coach/groups", label: "Groups",    Icon: FolderOpen },
  { href: "/coach/plans",  label: "Plans",     Icon: FileText },
]

export function CoachSidebar({ userName }: { userName?: string }) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const nameParts = (userName || "Coach").trim().split(" ")
  const surname = nameParts[nameParts.length - 1].toUpperCase()
  const firstName = nameParts[0]

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen flex flex-col overflow-hidden"
      style={{
        width: "200px",
        background: "var(--uni-primary)",
        backgroundImage:
          "repeating-linear-gradient(-55deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
      }}
    >
      {/* Wordmark */}
      <div className="px-[18px] py-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span
          className="block leading-none"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "16px", letterSpacing: "4px", color: "#f7f2ea" }}
        >
          LOCKER
        </span>
        <span
          className="block mt-0.5"
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--gold)" }}
        >
          Coach
        </span>
      </div>

      {/* Identity */}
      <div
        className="relative px-[18px] py-4 overflow-hidden flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          aria-hidden
          className="absolute right-2.5 top-2 select-none pointer-events-none leading-none"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "64px", color: "rgba(255,255,255,0.06)", letterSpacing: "-2px" }}
        >
          C
        </span>
        <p
          className="relative leading-tight"
          style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "18px", letterSpacing: "1.5px", color: "#f7f2ea" }}
        >
          {surname}
        </p>
        <p
          className="relative mt-0.5"
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}
        >
          {firstName}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
        <p
          className="px-[18px] pt-3 pb-1 uppercase"
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "8px", letterSpacing: "2px", color: "rgba(255,255,255,0.18)" }}
        >
          Portal
        </p>
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/coach"
              ? pathname === "/coach"
              : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className="w-full flex items-center gap-[9px] px-[18px] py-2 text-[12px] border-l-2 transition-all duration-[180ms]"
              style={{
                color: isActive ? "#f7f2ea" : "rgba(255,255,255,0.38)",
                background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                borderLeftColor: isActive ? "var(--gold)" : "transparent",
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
              <Icon style={{ width: "14px", height: "14px", opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-[11px]"
          style={{ color: "rgba(255,255,255,0.25)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)")}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
