import type React from "react"

export default function PhysioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="physio-theme">
      {children}
    </div>
  )
}
