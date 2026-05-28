"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token found.")
      return
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.code === "TOKEN_EXPIRED") {
          setStatus("expired")
          setMessage(data.error)
        } else if (data.error) {
          setStatus("error")
          setMessage(data.error)
        } else {
          setStatus("success")
          setMessage(data.message)
        }
      })
      .catch(() => {
        setStatus("error")
        setMessage("Something went wrong. Please try again.")
      })
  }, [token])

  return (
    <div className="w-full max-w-sm text-center">
      <p className="mb-10" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "20px", letterSpacing: "5px", color: "var(--ivy)" }}>
        LOCKEROOM
      </p>

      {status === "loading" && (
        <>
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "var(--ivy)" }} />
          <p className="text-muted-foreground text-sm">Verifying your email...</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#2d6a2d" }} />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "30px", letterSpacing: "1px", color: "var(--ink)" }}>
            Email Verified
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">{message}</p>
          <Button asChild className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </>
      )}

      {status === "expired" && (
        <>
          <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--red, #b83232)" }} />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "30px", letterSpacing: "1px", color: "var(--ink)" }}>
            Link Expired
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">{message}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--red, #b83232)" }} />
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "30px", letterSpacing: "1px", color: "var(--ink)" }}>
            Verification Failed
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">{message}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Suspense fallback={
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: "var(--ivy)" }} />
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
