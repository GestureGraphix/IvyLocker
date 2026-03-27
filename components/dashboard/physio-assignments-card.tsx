"use client"

import { useState } from "react"
import { Stethoscope, ChevronRight } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Exercise {
  name: string
  sets?: string
  reps?: string
  notes?: string
}

interface Assignment {
  id: string
  title: string
  type: "prehab" | "rehab"
  exercises: Exercise[]
  frequency?: string
  duration_weeks?: number
  description?: string
  notes?: string
  physio_name: string
}

export function PhysioAssignmentsCard() {
  const { data, isLoading } = useSWR("/api/athletes/physio-assignments", fetcher)
  const assignments: Assignment[] = data?.assignments || []

  if (isLoading || assignments.length === 0) return null

  return (
    <div
      className="bg-white overflow-hidden"
      style={{ border: "1px solid var(--rule)", borderRadius: "8px" }}
    >
      <div
        className="flex items-center gap-2 px-[18px] py-3"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <Stethoscope className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
        <span
          className="uppercase"
          style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", letterSpacing: "2px", color: "var(--muted)" }}
        >
          Physio Protocols
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--rule)" }}>
        {assignments.map(a => (
          <AssignmentRow key={a.id} assignment={a} />
        ))}
      </div>
    </div>
  )
}

function AssignmentRow({ assignment }: { assignment: Assignment }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <button
        className="w-full flex items-center justify-between px-[18px] py-3 text-left transition-colors hover:bg-[var(--cream-d)]"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="px-1.5 py-0.5 rounded text-white flex-shrink-0"
            style={{
              background: assignment.type === "rehab" ? "#f97316" : "#a78bfa",
              fontFamily: "'DM Mono', monospace",
              fontSize: "7px",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {assignment.type}
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{assignment.title}</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)", marginTop: "1px" }}>
              {assignment.physio_name}{assignment.frequency ? ` · ${assignment.frequency}` : ""}
            </p>
          </div>
        </div>
        <ChevronRight
          className="h-3.5 w-3.5 flex-shrink-0 ml-2 transition-transform"
          style={{ color: "var(--muted)", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div className="px-[18px] pb-3 space-y-2.5" style={{ background: "var(--cream-d, #f7f4ef)" }}>
          {assignment.description && (
            <p style={{ fontSize: "12px", color: "var(--soft)", lineHeight: 1.6 }}>{assignment.description}</p>
          )}
          {assignment.exercises?.length > 0 && (
            <div className="space-y-1">
              {assignment.exercises.map((ex, i) => (
                <div key={i} className="flex items-baseline gap-1.5">
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink)" }}>{ex.name}</span>
                  {(ex.sets || ex.reps) && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
                      {[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {assignment.duration_weeks && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
              {assignment.duration_weeks}-week program
            </p>
          )}
        </div>
      )}
    </div>
  )
}
