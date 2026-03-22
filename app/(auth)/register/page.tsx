"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

export default function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<"ATHLETE" | "COACH">("ATHLETE")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password !== confirmPassword) { setError("Passwords do not match"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    setIsLoading(true)
    try {
      await register(email, name, password, role)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div
        className="hidden md:flex flex-col justify-between w-[340px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{
          background: "#162e22",
          backgroundImage:
            "repeating-linear-gradient(-55deg, transparent, transparent 40px, rgba(255,255,255,0.018) 40px, rgba(255,255,255,0.018) 41px)",
        }}
      >
        <div>
          <p
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "20px",
              letterSpacing: "5px",
              color: "#f7f2ea",
            }}
          >
            LOCKER
          </p>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "8px",
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: "#c9a84c",
              marginTop: "4px",
            }}
          >
            Athlete Performance
          </p>
        </div>

        <div>
          <p
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "48px",
              lineHeight: 1,
              color: "#f7f2ea",
              letterSpacing: "1px",
            }}
          >
            Your locker. Your data. Your edge.
          </p>
        </div>

        <span
          aria-hidden
          className="absolute pointer-events-none select-none leading-none"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "220px",
            color: "rgba(255,255,255,0.03)",
            right: "-20px",
            bottom: "-40px",
            letterSpacing: "-8px",
          }}
        >
          00
        </span>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <p
            className="md:hidden mb-8"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "24px",
              letterSpacing: "4px",
              color: "var(--ivy)",
            }}
          >
            LOCKER
          </p>

          <div className="mb-8">
            <h1
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "36px",
                letterSpacing: "1px",
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              Create Account
            </h1>
            <p
              className="mt-1"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "1px",
                color: "var(--muted)",
              }}
            >
              Start tracking your performance today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="p-3 text-sm"
                style={{
                  background: "var(--red-pale, #f9e8e8)",
                  border: "1px solid rgba(184,50,50,0.2)",
                  color: "var(--red, #b83232)",
                  borderRadius: "3px",
                }}
              >
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label>I am a...</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["ATHLETE", "COACH"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="p-3 text-center transition-all rounded-sm text-sm font-medium"
                    style={{
                      background: role === r ? "var(--ivy)" : "var(--cream-d)",
                      color: role === r ? "var(--cream)" : "var(--soft)",
                      border: role === r ? "1px solid var(--ivy)" : "1px solid var(--cream-dd)",
                    }}
                  >
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" type="text" placeholder="John Smith" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating account...</>
              ) : (
                <><UserPlus className="h-4 w-4" />Create Account</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-sm text-center space-y-2">
            <p>
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login" className="text-ivy-mid font-medium hover:underline">Sign in</Link>
            </p>
            <p>
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">← Back to home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
