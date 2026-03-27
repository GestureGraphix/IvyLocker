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
  { id: "head",        label: "Head",        cx: 80,  cy: 20,  rx: 12, ry: 14 },
  { id: "neck",        label: "Neck",        cx: 80,  cy: 40,  rx: 6,  ry: 5  },
  { id: "l-shoulder",  label: "L Shoulder",  cx: 44,  cy: 58,  rx: 9,  ry: 8  },
  { id: "r-shoulder",  label: "R Shoulder",  cx: 116, cy: 58,  rx: 9,  ry: 8  },
  { id: "chest",       label: "Chest",       cx: 80,  cy: 76,  rx: 17, ry: 14 },
  { id: "l-bicep",     label: "L Bicep",     cx: 34,  cy: 84,  rx: 7,  ry: 14 },
  { id: "r-bicep",     label: "R Bicep",     cx: 126, cy: 84,  rx: 7,  ry: 14 },
  { id: "core",        label: "Core",        cx: 80,  cy: 108, rx: 14, ry: 13 },
  { id: "l-forearm",   label: "L Forearm",   cx: 31,  cy: 136, rx: 6,  ry: 12 },
  { id: "r-forearm",   label: "R Forearm",   cx: 129, cy: 136, rx: 6,  ry: 12 },
  { id: "l-hip",       label: "L Hip",       cx: 62,  cy: 140, rx: 11, ry: 9  },
  { id: "r-hip",       label: "R Hip",       cx: 98,  cy: 140, rx: 11, ry: 9  },
  { id: "l-quad",      label: "L Quad",      cx: 63,  cy: 182, rx: 10, ry: 20 },
  { id: "r-quad",      label: "R Quad",      cx: 97,  cy: 182, rx: 10, ry: 20 },
  { id: "l-knee",      label: "L Knee",      cx: 63,  cy: 215, rx: 9,  ry: 8  },
  { id: "r-knee",      label: "R Knee",      cx: 97,  cy: 215, rx: 9,  ry: 8  },
  { id: "l-shin",      label: "L Shin",      cx: 62,  cy: 242, rx: 8,  ry: 16 },
  { id: "r-shin",      label: "R Shin",      cx: 98,  cy: 242, rx: 8,  ry: 16 },
]

const BACK_ZONES: Zone[] = [
  { id: "b-head",       label: "Head",        cx: 80,  cy: 20,  rx: 12, ry: 14 },
  { id: "b-neck",       label: "Neck",        cx: 80,  cy: 40,  rx: 6,  ry: 5  },
  { id: "l-trap",       label: "L Trap",      cx: 62,  cy: 60,  rx: 12, ry: 8  },
  { id: "r-trap",       label: "R Trap",      cx: 98,  cy: 60,  rx: 12, ry: 8  },
  { id: "l-shoulder-b", label: "L Shoulder",  cx: 44,  cy: 58,  rx: 9,  ry: 8  },
  { id: "r-shoulder-b", label: "R Shoulder",  cx: 116, cy: 58,  rx: 9,  ry: 8  },
  { id: "upper-back",   label: "Upper Back",  cx: 80,  cy: 80,  rx: 15, ry: 13 },
  { id: "l-lat",        label: "L Lat",       cx: 61,  cy: 104, rx: 12, ry: 16 },
  { id: "r-lat",        label: "R Lat",       cx: 99,  cy: 104, rx: 12, ry: 16 },
  { id: "lower-back",   label: "Lower Back",  cx: 80,  cy: 124, rx: 14, ry: 10 },
  { id: "l-glute",      label: "L Glute",     cx: 63,  cy: 150, rx: 13, ry: 12 },
  { id: "r-glute",      label: "R Glute",     cx: 97,  cy: 150, rx: 13, ry: 12 },
  { id: "l-hamstring",  label: "L Hamstring", cx: 63,  cy: 182, rx: 10, ry: 20 },
  { id: "r-hamstring",  label: "R Hamstring", cx: 97,  cy: 182, rx: 10, ry: 20 },
  { id: "l-knee-b",     label: "L Knee",      cx: 63,  cy: 215, rx: 9,  ry: 8  },
  { id: "r-knee-b",     label: "R Knee",      cx: 97,  cy: 215, rx: 9,  ry: 8  },
  { id: "l-calf",       label: "L Calf",      cx: 62,  cy: 242, rx: 8,  ry: 16 },
  { id: "r-calf",       label: "R Calf",      cx: 98,  cy: 242, rx: 8,  ry: 16 },
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
      <div className="relative mt-5">
        {/* Hover label */}
        <div
          className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded pointer-events-none"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.5px",
            background: "var(--ink)",
            color: "#fff",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.1s",
            whiteSpace: "nowrap",
          }}
        >
          {hovered ? (zones.find(z => z.id === hovered)?.label ?? "") : ""}
        </div>

        <svg
          viewBox="0 0 160 275"
          width="130"
          height="224"
          style={{ display: "block" }}
        >
          {/* ── Slim athletic body silhouette ── */}
          <g
            fill="var(--cream-d, #f0ece4)"
            stroke="var(--cream-dd, #d8d2c8)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          >
            {/* Head — slightly elongated */}
            <ellipse cx="80" cy="20" rx="13" ry="15" />

            {/* Neck */}
            <rect x="74" y="33" width="12" height="14" rx="3" />

            {/* Torso — shoulders taper to narrow waist then slight hip flare
                Shoulder outer: x≈46–114  Waist: x≈59–101  Hip: x≈54–106 */}
            <path d="
              M 60,47
              L 46,52
              Q 38,58 36,67
              L 36,122
              Q 36,136 48,142
              L 56,156
              L 70,160
              L 90,160
              L 104,156
              Q 116,142 124,136
              L 124,67
              Q 122,58 114,52
              L 100,47
              Z
            " />

            {/* Left upper arm — slim, tapers slightly */}
            <path d="
              M 38,67
              Q 29,71 27,82
              L 25,124
              Q 25,130 31,130
              L 37,122
              L 38,67
            " />

            {/* Right upper arm */}
            <path d="
              M 122,67
              Q 131,71 133,82
              L 135,124
              Q 135,130 129,130
              L 123,122
              L 122,67
            " />

            {/* Left forearm */}
            <rect x="24" y="128" width="13" height="44" rx="6" />

            {/* Right forearm */}
            <rect x="123" y="128" width="13" height="44" rx="6" />

            {/* Left hand */}
            <ellipse cx="30" cy="178" rx="8" ry="6" />

            {/* Right hand */}
            <ellipse cx="130" cy="178" rx="8" ry="6" />

            {/* Left thigh — slim with gap */}
            <rect x="54" y="158" width="20" height="62" rx="9" />

            {/* Right thigh — 12 px gap between legs */}
            <rect x="86" y="158" width="20" height="62" rx="9" />

            {/* Left shin — slightly narrower than thigh */}
            <rect x="56" y="217" width="17" height="48" rx="7" />

            {/* Right shin */}
            <rect x="87" y="217" width="17" height="48" rx="7" />

            {/* Left foot */}
            <ellipse cx="64" cy="269" rx="14" ry="6" />

            {/* Right foot */}
            <ellipse cx="95" cy="269" rx="14" ry="6" />
          </g>

          {/* ── Interactive hotspot zones ── */}
          {zones.map(zone => {
            const isSelected = selected.includes(zone.id)
            const isHov = hovered === zone.id
            return (
              <ellipse
                key={zone.id}
                cx={zone.cx}
                cy={zone.cy}
                rx={zone.rx}
                ry={zone.ry}
                style={{ cursor: "pointer" }}
                fill={
                  isSelected ? "rgba(239,68,68,0.28)"
                  : isHov    ? "rgba(249,115,22,0.20)"
                  :             "rgba(0,0,0,0.04)"
                }
                stroke={
                  isSelected ? "#ef4444"
                  : isHov    ? "rgba(249,115,22,0.65)"
                  :             "rgba(0,0,0,0.09)"
                }
                strokeWidth={isSelected ? 1.5 : 1}
                onClick={() => toggle(zone.id)}
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}

          {/* ── Red dot on each selected zone ── */}
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
