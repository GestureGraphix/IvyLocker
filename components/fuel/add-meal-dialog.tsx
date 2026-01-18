"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Camera, ScanBarcode, Utensils, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface AddMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface AnalysisResult {
  description: string
  calories: number | null
  protein_grams: number | null
  carbs_grams: number | null
  fat_grams: number | null
  confidence: string
  notes: string | null
  source: string
}

export function AddMealDialog({ open, onOpenChange, onSuccess }: AddMealDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisSource, setAnalysisSource] = useState<"label" | "food" | null>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const foodInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    meal_type: "lunch",
    description: "",
    calories: "",
    protein_grams: "",
    carbs_grams: "",
    fat_grams: "",
  })

  const resetForm = () => {
    setFormData({
      meal_type: "lunch",
      description: "",
      calories: "",
      protein_grams: "",
      carbs_grams: "",
      fat_grams: "",
    })
    setAnalysisSource(null)
  }

  const handleImageAnalysis = async (file: File, type: "label" | "food") => {
    if (!file) return

    // Check file size (max 4MB for API)
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large. Please use an image under 4MB.")
      return
    }

    setIsAnalyzing(true)
    setAnalysisSource(type)

    try {
      const formData = new FormData()
      formData.append("image", file)
      formData.append("type", type)

      const res = await fetch("/api/athletes/meal-logs/analyze", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze image")
      }

      const result: AnalysisResult = data.data

      // Update form with results
      setFormData((prev) => ({
        ...prev,
        description: result.description || prev.description,
        calories: result.calories?.toString() || prev.calories,
        protein_grams: result.protein_grams?.toString() || prev.protein_grams,
        carbs_grams: result.carbs_grams?.toString() || prev.carbs_grams,
        fat_grams: result.fat_grams?.toString() || prev.fat_grams,
      }))

      const confidenceMsg = result.confidence === "low"
        ? " (rough estimate)"
        : result.confidence === "medium"
        ? " (estimated)"
        : ""

      const remaining = data.remaining as number
      const remainingMsg = remaining > 0 ? ` (${remaining} scans left today)` : " (no scans left today)"

      toast.success(`${type === "label" ? "Label scanned" : "Food analyzed"}${confidenceMsg}${remainingMsg}`)

      if (result.notes) {
        toast.info(result.notes, { duration: 5000 })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze image"
      toast.error(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleLabelCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageAnalysis(file, "label")
    }
    e.target.value = "" // Reset input
  }

  const handleFoodCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageAnalysis(file, "food")
    }
    e.target.value = "" // Reset input
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await fetch("/api/athletes/meal-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          calories: Number.parseInt(formData.calories) || 0,
          protein_grams: Number.parseInt(formData.protein_grams) || 0,
          carbs_grams: Number.parseInt(formData.carbs_grams) || 0,
          fat_grams: Number.parseInt(formData.fat_grams) || 0,
          date_time: new Date().toISOString(),
        }),
      })

      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Failed to log meal:", error)
      toast.error("Failed to log meal")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForm()
    }}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">Log Meal</DialogTitle>
        </DialogHeader>

        {/* Photo capture buttons */}
        <div className="grid grid-cols-2 gap-3">
          <input
            ref={labelInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleLabelCapture}
            className="hidden"
          />
          <input
            ref={foodInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFoodCapture}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => labelInputRef.current?.click()}
            disabled={isAnalyzing}
            className="h-20 flex flex-col gap-1"
          >
            {isAnalyzing && analysisSource === "label" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <ScanBarcode className="h-6 w-6" />
            )}
            <span className="text-xs">Scan Label</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => foodInputRef.current?.click()}
            disabled={isAnalyzing}
            className="h-20 flex flex-col gap-1"
          >
            {isAnalyzing && analysisSource === "food" ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
            <span className="text-xs">Photo Food</span>
          </Button>
        </div>

        {analysisSource === "food" && formData.calories && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
            <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
            <span className="text-yellow-200">
              Estimates are approximate. Adjust values if needed.
            </span>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meal_type">Meal Type</Label>
            <Select
              value={formData.meal_type}
              onValueChange={(value) => setFormData({ ...formData, meal_type: value })}
            >
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What did you eat?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="bg-secondary/50 border-border/50 resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                placeholder="0"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                placeholder="0"
                value={formData.protein_grams}
                onChange={(e) => setFormData({ ...formData, protein_grams: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                placeholder="0"
                value={formData.carbs_grams}
                onChange={(e) => setFormData({ ...formData, carbs_grams: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                placeholder="0"
                value={formData.fat_grams}
                onChange={(e) => setFormData({ ...formData, fat_grams: e.target.value })}
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isAnalyzing} className="flex-1 gradient-primary glow-primary">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Utensils className="mr-2 h-4 w-4" />
                  Log Meal
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
