"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong")
      } else {
        setSent(true)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <p className="mb-10" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px", letterSpacing: "5px", color: "var(--ivy)" }}>
          LOCKEROOM
        </p>

        {sent ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-6" style={{ background: "var(--cream-d)" }}>
              <Mail className="w-7 h-7" style={{ color: "var(--ivy)" }} />
            </div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "30px", letterSpacing: "1px", color: "var(--ink)" }}>
              Check Your Email
            </h1>
            <p className="mt-3 mb-8 text-sm text-muted-foreground leading-relaxed">
              If <span style={{ color: "var(--ink)" }}>{email}</span> is registered, you'll receive a reset link shortly. Check your spam folder if you don't see it.
            </p>
            <Link href="/login" className="text-sm text-ivy-mid font-medium hover:underline">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "36px", letterSpacing: "1px", color: "var(--ink)", lineHeight: 1 }}>
                Forgot Password
              </h1>
              <p className="mt-1" style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "1px", color: "var(--muted)" }}>
                Enter your email and we'll send a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm" style={{ background: "var(--red-pale, #f9e8e8)", border: "1px solid rgba(184,50,50,0.2)", color: "var(--red, #b83232)", borderRadius: "3px" }}>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full mt-2">
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            <div className="mt-6 text-sm text-center">
              <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
