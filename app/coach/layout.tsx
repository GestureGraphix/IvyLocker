import type React from "react"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CoachSidebar } from "@/components/coach/coach-sidebar"

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect("/")

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      <CoachSidebar userName={user.name} />
      <main className="pl-[200px] pb-8 w-full">
        {children}
      </main>
    </div>
  )
}
