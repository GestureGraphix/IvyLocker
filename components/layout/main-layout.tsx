"use client"

import type React from "react"

import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"

interface MainLayoutProps {
  children: React.ReactNode
  userRole?: "ATHLETE" | "COACH"
  userName?: string
}

export function MainLayout({ children, userRole = "ATHLETE", userName = "Athlete" }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar — fixed 200px */}
      <div className="hidden md:block">
        <Sidebar userRole={userRole} userName={userName} />
      </div>

      {/* Main content */}
      <main className="md:pl-[200px] pb-20 md:pb-0">
        <div className="min-h-screen">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
