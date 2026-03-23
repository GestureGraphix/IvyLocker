import { NextResponse } from "next/server"

// Main residential/house dining venues only (excludes retail, coffee, express)
const DINING_HALLS = [
  { id: 593,  slug: "593",  name: "1920 Commons" },
  { id: 636,  slug: "636",  name: "Hill House" },
  { id: 637,  slug: "637",  name: "Kings Court" },
  { id: 638,  slug: "638",  name: "Falk Kosher" },
  { id: 639,  slug: "639",  name: "Houston Market" },
  { id: 1442, slug: "1442", name: "Lauder College House" },
]

const PENN_MOBILE_BASE = "https://pennmobile.org/api/dining"

interface MenuItem {
  id: number
  menuItemId: number
  name: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
  servingSize?: string
  section?: string
}

function parseG(val: string | undefined): number {
  if (!val) return 0
  return Math.round(parseFloat(val.replace(/[^\d.]/g, "")) || 0)
}

async function safeFetch(url: string, timeout = 10000): Promise<any | null> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "IvyLocker/1.0" },
    })
    clearTimeout(id)
    if (!res.ok) return null
    return await res.json()
  } catch {
    clearTimeout(id)
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
  const locationSlug = searchParams.get("location") || "593"
  const locationId = parseInt(locationSlug, 10)

  const hall = DINING_HALLS.find((h) => h.id === locationId)
  if (!hall) {
    return NextResponse.json({ error: "Invalid dining hall" }, { status: 400 })
  }

  const fallback = {
    error: "Failed to fetch menu",
    meals: [],
    diningHalls: DINING_HALLS.map((h) => ({ slug: h.slug, name: h.name })),
  }

  try {
    // Penn Mobile returns all venues for a given date in one call
    const data = await safeFetch(`${PENN_MOBILE_BASE}/menus/${date}/`)
    if (!Array.isArray(data)) return NextResponse.json(fallback, { status: 500 })

    // Filter to the requested venue — each entry is one meal period at one venue
    const venueMenus: any[] = data.filter(
      (entry: any) => entry?.venue?.venue_id === locationId
    )

    if (venueMenus.length === 0) {
      return NextResponse.json({
        date,
        location: hall.name,
        locationSlug,
        meals: [],
        diningHalls: DINING_HALLS.map((h) => ({ slug: h.slug, name: h.name })),
      })
    }

    // Build meals — each entry is one service period (Breakfast / Lunch / Dinner)
    const meals = []
    for (const menu of venueMenus) {
      const mealType: string = menu.service ?? "Other"
      const items: MenuItem[] = []
      const seenIds = new Set<number>()

      for (const station of menu.stations ?? []) {
        const section: string = station.name ?? ""
        for (const item of station.items ?? []) {
          if (seenIds.has(item.item_id)) continue
          seenIds.add(item.item_id)

          const ni = item.nutrition_info ?? {}
          items.push({
            id: item.item_id,
            menuItemId: item.item_id,
            name: item.name ?? "",
            calories: parseInt(ni["Calories"] ?? "0") || 0,
            proteinG: parseG(ni["Protein"]),
            fatG: parseG(ni["Total Fat"]),
            carbsG: parseG(ni["Total Carbohydrate"]),
            servingSize: ni["Serving Size"] ?? undefined,
            section: section || undefined,
          })
        }
      }

      if (items.length > 0) meals.push({ mealType, items })
    }

    // Sort meals in natural order
    const ORDER = ["Breakfast", "Lunch", "Dinner", "Brunch"]
    meals.sort((a, b) => {
      const ai = ORDER.indexOf(a.mealType)
      const bi = ORDER.indexOf(b.mealType)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

    return NextResponse.json({
      date,
      location: hall.name,
      locationSlug,
      meals,
      diningHalls: DINING_HALLS.map((h) => ({ slug: h.slug, name: h.name })),
    })
  } catch (error) {
    console.error("Penn menu fetch error:", error)
    return NextResponse.json(fallback, { status: 500 })
  }
}
