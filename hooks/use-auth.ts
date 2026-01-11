"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

interface User {
  id: string
  email: string
  name: string
  role: "ATHLETE" | "COACH"
  sport?: string
  level?: string
  team?: string
  position?: string
  height_cm?: number
  weight_kg?: number
  phone?: string
  location?: string
  university?: string
  graduation_year?: number
  allergies?: string[]
  tags?: string[]
  hydration_goal_oz?: number
  calorie_goal?: number
  protein_goal_grams?: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 401) return { user: null }
    throw new Error("Failed to fetch")
  }
  return res.json()
}

export function useAuth() {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR<{ user: User | null }>("/api/me", fetcher)

  const user = data?.user || null
  const isAuthenticated = !!user

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to login")
      }

      await mutate()
      router.push("/")
      return data
    },
    [mutate, router],
  )

  const register = useCallback(
    async (email: string, name: string, password: string, role: "ATHLETE" | "COACH" = "ATHLETE") => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to register")
      }

      await mutate()
      router.push("/")
      return data
    },
    [mutate, router],
  )

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    await mutate({ user: null }, false)
    router.push("/login")
  }, [mutate, router])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    mutate,
  }
}
