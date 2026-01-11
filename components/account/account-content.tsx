"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { User, Mail, Phone, MapPin, GraduationCap, Target, Droplets, Flame, Beef, Save, Loader2, Lock, Eye, EyeOff } from "lucide-react"

export function AccountContent() {
  const { user, logout, mutate } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    sport: "",
    team: "",
    position: "",
    phone: "",
    location: "",
    university: "",
    graduation_year: "",
    height_cm: "",
    weight_kg: "",
    hydration_goal_oz: "100",
    calorie_goal: "2500",
    protein_goal_grams: "150",
  })

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        sport: user.sport || "",
        team: user.team || "",
        position: user.position || "",
        phone: user.phone || "",
        location: user.location || "",
        university: user.university || "",
        graduation_year: user.graduation_year?.toString() || "",
        height_cm: user.height_cm?.toString() || "",
        weight_kg: user.weight_kg?.toString() || "",
        hydration_goal_oz: user.hydration_goal_oz?.toString() || "100",
        calorie_goal: user.calorie_goal?.toString() || "2500",
        protein_goal_grams: user.protein_goal_grams?.toString() || "150",
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/athletes/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          graduation_year: formData.graduation_year ? Number.parseInt(formData.graduation_year) : null,
          height_cm: formData.height_cm ? Number.parseFloat(formData.height_cm) : null,
          weight_kg: formData.weight_kg ? Number.parseFloat(formData.weight_kg) : null,
          hydration_goal_oz: Number.parseInt(formData.hydration_goal_oz),
          calorie_goal: Number.parseInt(formData.calorie_goal),
          protein_goal_grams: Number.parseInt(formData.protein_goal_grams),
        }),
      })

      if (res.ok) {
        // Refresh user data in auth context
        await mutate()
        toast.success("Profile updated successfully")
      } else {
        toast.error("Failed to update profile")
      }
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess(false)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setIsChangingPassword(true)

    try {
      const res = await fetch("/api/athletes/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to change password")
        return
      }

      toast.success("Password changed successfully")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error) {
      toast.error("Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <User className="h-7 w-7 text-primary" />
            Account Settings
          </h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>
        <Button variant="destructive" onClick={logout}>
          Sign Out
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Personal Information
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-secondary/50 border-border/50 pl-10"
                  disabled
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-secondary/50 border-border/50 pl-10"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-secondary/50 border-border/50 pl-10"
                  placeholder="City, State"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Athletic Profile */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-warning" />
            Athletic Profile
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Input
                id="sport"
                value={formData.sport}
                onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                className="bg-secondary/50 border-border/50"
                placeholder="e.g., Basketball"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Input
                id="team"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                className="bg-secondary/50 border-border/50"
                placeholder="e.g., Varsity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="bg-secondary/50 border-border/50"
                placeholder="e.g., Point Guard"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
        </GlassCard>

        {/* Academic Info */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-success" />
            Academic Information
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                className="bg-secondary/50 border-border/50"
                placeholder="e.g., Yale University"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grad_year">Graduation Year</Label>
              <Input
                id="grad_year"
                type="number"
                min="2024"
                max="2030"
                value={formData.graduation_year}
                onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                className="bg-secondary/50 border-border/50"
                placeholder="2026"
              />
            </div>
          </div>
        </GlassCard>

        {/* Nutrition Goals */}
        <GlassCard>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent" />
            Nutrition Goals
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hydration" className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-primary" />
                Daily Hydration (oz)
              </Label>
              <Input
                id="hydration"
                type="number"
                value={formData.hydration_goal_oz}
                onChange={(e) => setFormData({ ...formData, hydration_goal_oz: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories" className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-warning" />
                Daily Calories
              </Label>
              <Input
                id="calories"
                type="number"
                value={formData.calorie_goal}
                onChange={(e) => setFormData({ ...formData, calorie_goal: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein" className="flex items-center gap-2">
                <Beef className="h-4 w-4 text-success" />
                Daily Protein (g)
              </Label>
              <Input
                id="protein"
                type="number"
                value={formData.protein_goal_grams}
                onChange={(e) => setFormData({ ...formData, protein_goal_grams: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
        </GlassCard>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="gradient-primary glow-primary px-8">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Password Change */}
      <GlassCard>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-destructive" />
          Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="bg-secondary/50 border-border/50 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="bg-secondary/50 border-border/50 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="bg-secondary/50 border-border/50"
                required
                minLength={8}
              />
            </div>
          </div>

          {passwordError && (
            <p className="text-sm text-destructive">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-success">Password changed successfully!</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  )
}
