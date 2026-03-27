"use client"

import { useState } from "react"
import { Stethoscope, Plus, Trash2, ChevronDown } from "lucide-react"

interface Note {
  id: string
  type: "prehab" | "rehab"
  title: string
  body: string
  createdAt: Date
}

export function PhysioDashboard() {
  const [notes, setNotes] = useState<Note[]>([])
  const [type, setType] = useState<"prehab" | "rehab">("prehab")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  function addNote() {
    if (!title.trim() && !body.trim()) return
    const note: Note = {
      id: crypto.randomUUID(),
      type,
      title: title.trim() || (type === "prehab" ? "Prehab protocol" : "Rehab protocol"),
      body: body.trim(),
      createdAt: new Date(),
    }
    setNotes(n => [note, ...n])
    setTitle("")
    setBody("")
  }

  function deleteNote(id: string) {
    setNotes(n => n.filter(note => note.id !== id))
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)" }}
      >
        <Stethoscope className="h-5 w-5 flex-shrink-0" style={{ color: "#a78bfa" }} />
        <div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "24px",
              letterSpacing: "1px",
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            Physio Portal
          </h1>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginTop: "2px",
            }}
          >
            Prehab &amp; Rehab Assignments
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-5">
        {/* Compose box */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
        >
          {/* Type toggle */}
          <div
            className="flex"
            style={{ borderBottom: "1px solid var(--cream-dd, #e8e2d9)" }}
          >
            {(["prehab", "rehab"] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="flex-1 py-2.5 text-center capitalize transition-all"
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  background: type === t ? (t === "prehab" ? "rgba(167,139,250,0.10)" : "rgba(249,115,22,0.10)") : "transparent",
                  color: type === t ? (t === "prehab" ? "#a78bfa" : "#f97316") : "var(--muted)",
                  borderBottom: type === t ? `2px solid ${t === "prehab" ? "#a78bfa" : "#f97316"}` : "2px solid transparent",
                  fontWeight: type === t ? 600 : 400,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-4 space-y-3">
            <input
              type="text"
              placeholder="Assignment title (e.g. Hip stability protocol)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-transparent outline-none"
              style={{
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--ink)",
                borderBottom: "1px solid var(--cream-dd, #e8e2d9)",
                paddingBottom: "10px",
              }}
            />
            <textarea
              placeholder={
                type === "prehab"
                  ? "Describe the prehab exercises, sets/reps, cues, frequency..."
                  : "Describe the rehab protocol, progressions, restrictions, timeline..."
              }
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              className="w-full bg-transparent outline-none resize-none"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                lineHeight: "1.8",
                color: "var(--soft)",
                letterSpacing: "0.2px",
              }}
            />
          </div>

          <div
            className="px-4 py-3 flex justify-end"
            style={{ borderTop: "1px solid var(--cream-dd, #e8e2d9)" }}
          >
            <button
              onClick={addNote}
              disabled={!title.trim() && !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded transition-all"
              style={{
                background: (!title.trim() && !body.trim()) ? "var(--cream-d)" : "#a78bfa",
                color: (!title.trim() && !body.trim()) ? "var(--muted)" : "#fff",
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Save Assignment
            </button>
          </div>
        </div>

        {/* Saved notes */}
        {notes.length === 0 ? (
          <div
            className="rounded-lg p-8 text-center"
            style={{ border: "1px dashed var(--cream-dd, #e8e2d9)" }}
          >
            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                color: "var(--muted)",
                lineHeight: 1.8,
                letterSpacing: "0.3px",
              }}
            >
              No assignments yet.<br />
              Write a prehab or rehab protocol above and hit Save.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p
              className="uppercase"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "8px",
                letterSpacing: "2px",
                color: "var(--muted)",
              }}
            >
              Saved ({notes.length})
            </p>
            {notes.map(note => (
              <div
                key={note.id}
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--cream-dd, #e8e2d9)", background: "#fff" }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  style={{ background: "var(--cream-d, #f7f4ef)" }}
                  onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex-shrink-0 px-1.5 py-0.5 rounded text-white"
                      style={{
                        background: note.type === "rehab" ? "#f97316" : "#a78bfa",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "8px",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                      }}
                    >
                      {note.type}
                    </span>
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: "var(--ink)" }}
                    >
                      {note.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px",
                        color: "var(--muted)",
                      }}
                    >
                      {note.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteNote(note.id) }}
                      className="opacity-30 hover:opacity-70 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: "#b83232" }} />
                    </button>
                    <ChevronDown
                      className="h-3.5 w-3.5 transition-transform"
                      style={{
                        color: "var(--muted)",
                        transform: expanded === note.id ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </div>
                {expanded === note.id && note.body && (
                  <div
                    className="px-4 py-3"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "12px",
                      lineHeight: "1.8",
                      color: "var(--soft)",
                      whiteSpace: "pre-wrap",
                      letterSpacing: "0.2px",
                    }}
                  >
                    {note.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
