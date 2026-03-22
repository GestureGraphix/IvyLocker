import type React from "react"

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-theme">
      {children}
    </div>
  )
}
