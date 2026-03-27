"use client"

import { useState } from "react"

interface Zone {
  id: string
  label: string
  cx: number
  cy: number
  rx: number
  ry: number
}

const FRONT_ZONES: Zone[] = [
  { id: "head",        label: "Head",        cx: 80,  cy: 22,  rx: 15, ry: 17 },
  { id: "neck",        label: "Neck",        cx: 80,  cy: 43,  rx: 7,  ry: 6  },
  { id: "l-shoulder",  label: "L Shoulder",  cx: 33,  cy: 64,  rx: 10, ry: 9  },
  { id: "r-shoulder",  label: "R Shoulder",  cx: 127, cy: 64,  rx: 10, ry: 9  },
  { id: "chest",       label: "Chest",       cx: 80,  cy: 83,  rx: 21, ry: 17 },
  { id: "l-bicep",     label: "L Bicep",     cx: 20,  cy: 95,  rx: 8,  ry: 16 },
  { id: "r-bicep",     label: "R Bicep",     cx: 140, cy: 95,  rx: 8,  ry: 16 },
  { id: "core",        label: "Core",        cx: 80,  cy: 116, rx: 18, ry: 14 },
  { id: "l-forearm",   label: "L Forearm",   cx: 20,  cy: 153, rx: 8,  ry: 14 },
  { id: "r-forearm",   label: "R Forearm",   cx: 140, cy: 153, rx: 8,  ry: 14 },
  { id: "l-hip",       label: "L Hip",       cx: 60,  cy: 148, rx: 13, ry: 10 },
  { id: "r-hip",       label: "R Hip",       cx: 100, cy: 148, rx: 13, ry: 10 },
  { id: "l-quad",      label: "L Quad",      cx: 65,  cy: 191, rx: 13, ry: 22 },
  { id: "r-quad",      label: "R Quad",      cx: 95,  cy: 191, rx: 13, ry: 22 },
  { id: "l-knee",      label: "L Knee",      cx: 65,  cy: 223, rx: 12, ry: 9  },
  { id: "r-knee",      label: "R Knee",      cx: 95,  cy: 223, rx: 12, ry: 9  },
  { id: "l-shin",      label: "L Shin",      cx: 65,  cy: 251, rx: 11, ry: 18 },
  { id: "r-shin",      label: "R Shin",      cx: 95,  cy: 251, rx: 11, ry: 18 },
]

const BACK_ZONES: Zone[] = [
  { id: "b-head",       label: "Head",        cx: 80,  cy: 22,  rx: 15, ry: 17 },
  { id: "b-neck",       label: "Neck",        cx: 80,  cy: 43,  rx: 7,  ry: 6  },
  { id: "l-trap",       label: "L Trap",      cx: 62,  cy: 66,  rx: 14, ry: 9  },
  { id: "r-trap",       label: "R Trap",      cx: 98,  cy: 66,  rx: 14, ry: 9  },
  { id: "l-shoulder-b", label: "L Shoulder",  cx: 33,  cy: 64,  rx: 10, ry: 9  },
  { id: "r-shoulder-b", label: "R Shoulder",  cx: 127, cy: 64,  rx: 10, ry: 9  },
  { id: "upper-back",   label: "Upper Back",  cx: 80,  cy: 88,  rx: 18, ry: 15 },
  { id: "l-lat",        label: "L Lat",       cx: 60,  cy: 112, rx: 14, ry: 18 },
  { id: "r-lat",        label: "R Lat",       cx: 100, cy: 112, rx: 14, ry: 18 },
  { id: "lower-back",   label: "Lower Back",  cx: 80,  cy: 133, rx: 18, ry: 12 },
  { id: "l-glute",      label: "L Glute",     cx: 65,  cy: 158, rx: 16, ry: 14 },
  { id: "r-glute",      label: "R Glute",     cx: 95,  cy: 158, rx: 16, ry: 14 },
  { id: "l-hamstring",  label: "L Hamstring", cx: 65,  cy: 191, rx: 13, ry: 22 },
  { id: "r-hamstring",  label: "R Hamstring", cx: 95,  cy: 191, rx: 13, ry: 22 },
  { id: "l-knee-b",     label: "L Knee",      cx: 65,  cy: 223, rx: 12, ry: 9  },
  { id: "r-knee-b",     label: "R Knee",      cx: 95,  cy: 223, rx: 12, ry: 9  },
  { id: "l-calf",       label: "L Calf",      cx: 65,  cy: 251, rx: 11, ry: 18 },
  { id: "r-calf",       label: "R Calf",      cx: 95,  cy: 251, rx: 11, ry: 18 },
]

interface BodyMapProps {
  selected: string[]
  onChange: (ids: string[]) => void
}

export function BodyMap({ selected, onChange }: BodyMapProps) {
  const [view, setView] = useState<"front" | "back">("front")
  const [hovered, setHovered] = useState<string | null>(null)

  const zones = view === "front" ? FRONT_ZONES : BACK_ZONES

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Front / Back toggle */}
      <div
        className="flex rounded overflow-hidden self-center"
        style={{
          border: "1px solid var(--cream-dd, #e8e2d9)",
          background: "var(--cream-d, #f0ece4)",
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        {(["front", "back"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-4 py-1.5 transition-all capitalize"
            style={{
              background: view === v ? "var(--ink)" : "transparent",
              color: view === v ? "#fff" : "var(--muted)",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Body SVG */}
      <div className="relative">
        {/* Hover label */}
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded pointer-events-none transition-opacity"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.5px",
            background: "var(--ink)",
            color: "#fff",
            opacity: hovered ? 1 : 0,
            whiteSpace: "nowrap",
          }}
        >
          {hovered ? (zones.find(z => z.id === hovered)?.label ?? "") : ""}
        </div>

        <svg
          viewBox="0 0 160 295"
          width="150"
          height="277"
          style={{ display: "block" }}
        >
          {/* ── Body silhouette ── */}
          <g fill="var(--cream-d, #f0ece4)" stroke="var(--cream-dd, #ddd8cf)" strokeWidth="1.5" strokeLinejoin="round">
            {/* Head */}
            <ellipse cx="80" cy="22" rx="16" ry="18" />
            {/* Neck */}
            <rect x="73" y="37" width="14" height="13" rx="3" />
            {/* Torso — shoulders + waist + hips */}
            <path d="M50,49 L34,58 Q26,63 26,73 L26,132 Q26,138 34,141 L50,144 Q54,160 64,163 L96,163 Q106,160 110,144 L126,141 Q134,138 134,132 L134,73 Q134,63 126,58 L110,49 Z" />
            {/* Left upper arm */}
            <path d="M26,73 Q15,77 13,91 L11,128 Q11,134 19,134 L28,132 L28,62 Q27,68 26,73 Z" />
            {/* Right upper arm */}
            <path d="M134,73 Q145,77 147,91 L149,128 Q149,134 141,134 L132,132 L132,62 Q133,68 134,73 Z" />
            {/* Left forearm */}
            <rect x="11" y="132" width="18" height="50" rx="8" />
            {/* Right forearm */}
            <rect x="131" y="132" width="18" height="50" rx="8" />
            {/* Left hand */}
            <ellipse cx="20" cy="188" rx="10" ry="7" />
            {/* Right hand */}
            <ellipse cx="140" cy="188" rx="10" ry="7" />
            {/* Left thigh */}
            <rect x="50" y="161" width="29" height="66" rx="11" />
            {/* Right thigh */}
            <rect x="81" y="161" width="29" height="66" rx="11" />
            {/* Left shin */}
            <rect x="51" y="224" width="27" height="54" rx="9" />
            {/* Right shin */}
            <rect x="82" y="224" width="27" height="54" rx="9" />
            {/* Left foot */}
            <ellipse cx="64" cy="283" rx="18" ry="8" />
            {/* Right foot */}
            <ellipse cx="96" cy="283" rx="18" ry="8" />
          </g>

          {/* ── Interactive hotspot zones ── */}
          {zones.map(zone => {
            const isSelected = selected.includes(zone.id)
            const isHovered = hovered === zone.id
            return (
              <ellipse
                key={zone.id}
                cx={zone.cx}
                cy={zone.cy}
                rx={zone.rx}
                ry={zone.ry}
                style={{ cursor: "pointer" }}
                fill={
                  isSelected
                    ? "rgba(239,68,68,0.28)"
                    : isHovered
                    ? "rgba(249,115,22,0.18)"
                    : "rgba(0,0,0,0.04)"
                }
                stroke={
                  isSelected
                    ? "#ef4444"
                    : isHovered
                    ? "rgba(249,115,22,0.6)"
                    : "rgba(0,0,0,0.08)"
                }
                strokeWidth={isSelected ? 1.5 : 1}
                onClick={() => toggle(zone.id)}
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}

          {/* ── Dot indicators on selected zones ── */}
          {zones.filter(z => selected.includes(z.id)).map(zone => (
            <circle
              key={`dot-${zone.id}`}
              cx={zone.cx}
              cy={zone.cy}
              r="3"
              fill="#ef4444"
              style={{ pointerEvents: "none" }}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
