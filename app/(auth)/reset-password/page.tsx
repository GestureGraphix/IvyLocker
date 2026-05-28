"use client"

import type React from "react"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle } from "lucide-react"

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong")
      } else {
        setSuccess(true)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-ivy-mid font-medium hover:underline text-sm">
          Request a new one
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <p className="mb-10" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px", letterSpacing: "5px", color: "var(--ivy)" }}>
        LOCKEROOM
      </p>

      {success ? (
        <div className="text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#2d6a2d" }} />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "30px", letterSpacing: "1px", color: "var(--ink)" }}>
            Password Reset
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            Your password has been updated. You can now sign in.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", letterSpacing: "1px", color: "var(--ink)", lineHeight: 1 }}>
              Reset Password
            </h1>
            <p className="mt-1" style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "1px", color: "var(--muted)" }}>
              Choose a new password for your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm" style={{ background: "var(--red-pale, #f9e8e8)", border: "1px solid rgba(184,50,50,0.2)", color: "var(--red, #b83232)", borderRadius: "3px" }}>
                {error}
                {error.includes("expired") && (
                  <Link href="/forgot-password" className="block mt-1.5 underline font-medium" style={{ color: "var(--red, #b83232)" }}>
                    Request a new link
                  </Link>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Resetting...</>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Suspense fallback={
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: "var(--ivy)" }} />
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  )
}
