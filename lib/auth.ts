import { cookies } from "next/headers"
import { sql } from "./db"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "locker-v2-secret-key-change-in-production")

export interface User {
  id: string
  email: string
  name: string
  role: "ATHLETE" | "COACH"
}

export interface Session {
  user: User
  expires: Date
}

// Create JWT token
export async function createToken(user: User): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
  return token
}

// Verify JWT token
export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as Session
  } catch {
    return null
  }
}

// Get current session from cookies
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  return verifyToken(token)
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user || null
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

// Clear auth cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
}

// Hash password using Web Crypto API (works in Edge runtime)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.PASSWORD_SALT || "locker-salt"))
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

// Get user by email
export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT id, email, name, role, password_hash 
    FROM users 
    WHERE email = ${email}
  `
  return result[0] || null
}

// Create new user
export async function createUser(email: string, name: string, password: string, role: "ATHLETE" | "COACH" = "ATHLETE") {
  const passwordHash = await hashPassword(password)

  const result = await sql`
    INSERT INTO users (email, name, password_hash, role)
    VALUES (${email}, ${name}, ${passwordHash}, ${role})
    RETURNING id, email, name, role
  `

  const user = result[0]

  // Create athlete profile if role is ATHLETE
  if (role === "ATHLETE") {
    await sql`
      INSERT INTO athlete_profiles (user_id)
      VALUES (${user.id})
    `
  }

  return user
}
