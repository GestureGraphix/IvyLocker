export interface UniversityTheme {
  primary: string   // header bg, sidebar, primary buttons
  accent: string    // text/highlight on primary bg
  mid: string       // darker shade for icons on white bg
  light: string     // lighter shade for progress bars, fills
  pale: string      // very light tint for chip/card backgrounds
  name: string
}

export const UNIVERSITY_THEMES: Record<string, UniversityTheme> = {
  "Harvard University": {
    primary: "#A51C30",
    accent: "#FFFFFF",
    mid: "#7a1525",
    light: "#d45a6a",
    pale: "#fce8ea",
    name: "Harvard University",
  },
  "Yale University": {
    primary: "#00356B",
    accent: "#FFFFFF",
    mid: "#002a56",
    light: "#3a6aaa",
    pale: "#e0eaf6",
    name: "Yale University",
  },
  "Princeton University": {
    primary: "#E87722",
    accent: "#18181B",
    mid: "#b85c0a",
    light: "#f0a060",
    pale: "#fef0e4",
    name: "Princeton University",
  },
  "Columbia University": {
    primary: "#002A86",
    accent: "#9BCDEB",
    mid: "#00226b",
    light: "#4a6bbf",
    pale: "#e6eaf8",
    name: "Columbia University",
  },
  "University of Pennsylvania": {
    primary: "#011F5B",
    accent: "#990000",
    mid: "#011848",
    light: "#3a5099",
    pale: "#e6eaf8",
    name: "University of Pennsylvania",
  },
  "Brown University": {
    primary: "#4E3629",
    accent: "#C00404",
    mid: "#3a2820",
    light: "#8a6555",
    pale: "#f0eae6",
    name: "Brown University",
  },
  "Dartmouth College": {
    primary: "#00693E",
    accent: "#FFFFFF",
    mid: "#00542f",
    light: "#4aaa77",
    pale: "#e6f5ed",
    name: "Dartmouth College",
  },
  "Cornell University": {
    primary: "#B31B1B",
    accent: "#FFFFFF",
    mid: "#8a1414",
    light: "#d45a5a",
    pale: "#fce8e8",
    name: "Cornell University",
  },
}

export const DEFAULT_THEME: UniversityTheme = {
  primary: "#162e22",
  accent: "#c9a84c",
  mid: "#2d6a4f",
  light: "#52b788",
  pale: "#d8f0e4",
  name: "IvyLocker",
}

export function getUniversityTheme(university?: string | null): UniversityTheme {
  if (!university) return DEFAULT_THEME
  return UNIVERSITY_THEMES[university] ?? DEFAULT_THEME
}
