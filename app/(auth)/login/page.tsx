"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, LogIn } from "lucide-react"

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — ivy green */}
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
            Track every rep. Every meal. Every win.
          </p>
        </div>

        {/* Background number */}
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
          01
        </span>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile wordmark */}
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
              Welcome Back
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
              Sign in to your Locker account
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

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-2">
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Signing in...</>
              ) : (
                <><LogIn className="h-4 w-4" />Sign In</>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-sm text-center">
            <p>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/register" className="text-ivy-mid font-medium hover:underline">
                Create one
              </Link>
            </p>
            <p>
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                Continue as guest with demo data
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
