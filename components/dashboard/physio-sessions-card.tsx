"use client"

import { useState } from "react"
import { Stethoscope, ChevronRight } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Assignment {
  id: string
  title: string
  type: "prehab" | "rehab"
  description: string | null
  frequency: string | null
  duration_weeks: number | null
  physio_name: string
}

export function PhysioSessionsCard() {
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
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "2px",
            color: "var(--muted)",
          }}
        >
          Physio Protocols
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--rule)" }}>
        {assignments.map((a) => (
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
        onClick={() => setExpanded((e) => !e)}
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
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
              {assignment.title}
            </p>
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                color: "var(--muted)",
                marginTop: "1px",
              }}
            >
              {assignment.physio_name}
              {assignment.frequency ? ` · ${assignment.frequency}` : ""}
            </p>
          </div>
        </div>
        <ChevronRight
          className="h-3.5 w-3.5 flex-shrink-0 ml-2 transition-transform"
          style={{
            color: "var(--muted)",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {expanded && assignment.description && (
        <div className="px-[18px] pb-3" style={{ background: "var(--cream-d, #f7f4ef)" }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              lineHeight: 1.7,
              color: "var(--ink)",
              whiteSpace: "pre-wrap",
            }}
          >
            {assignment.description}
          </div>
        </div>
      )}
    </div>
  )
}
