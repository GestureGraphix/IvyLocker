"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface LibraryExercise {
  id: string
  name: string
  body_region: string | null
  category: string | null
  default_sets: number | null
  default_reps: string | null
  default_hold_seconds: number | null
  default_duration_seconds: number | null
  instructions: string | null
}

interface ExercisePickerProps {
  value: string
  onChange: (name: string, exercise?: LibraryExercise) => void
  placeholder?: string
}

export function ExercisePicker({ value, onChange, placeholder = "Exercise name..." }: ExercisePickerProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<LibraryExercise[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const search = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/physio/exercises?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.exercises || [])
        setIsOpen(true)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)
  }

  const handleInputChange = (val: string) => {
    setQuery(val)
    onChange(val)
    search(val)
  }

  const handleSelect = (exercise: LibraryExercise) => {
    setQuery(exercise.name)
    onChange(exercise.name, exercise)
    setIsOpen(false)
  }

  const regionColors: Record<string, string> = {
    hip: "text-purple-400",
    knee: "text-blue-400",
    shoulder: "text-orange-400",
    back: "text-green-400",
    ankle: "text-cyan-400",
    neck: "text-yellow-400",
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          placeholder={placeholder}
          className="pl-8 h-8 text-sm bg-secondary/50"
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((ex) => (
            <button
              key={ex.id}
              onClick={() => handleSelect(ex)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>{ex.name}</span>
              {ex.body_region && (
                <span className={`text-xs capitalize ${regionColors[ex.body_region] || "text-muted-foreground"}`}>
                  {ex.body_region}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
