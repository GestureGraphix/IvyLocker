"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getUniversityTheme } from "@/lib/university-themes"

export function UniversityThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const theme = getUniversityTheme(user?.university)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--uni-primary", theme.primary)
    root.style.setProperty("--uni-accent", theme.accent)
    root.style.setProperty("--uni-mid", theme.mid)
    root.style.setProperty("--uni-light", theme.light)
    root.style.setProperty("--uni-pale", theme.pale)
  }, [theme.primary, theme.accent, theme.mid, theme.light, theme.pale])

  return <>{children}</>
}
