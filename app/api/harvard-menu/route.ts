import { NextResponse } from "next/server"

// Harvard dining halls — IDs from CS50 Dining API (api.cs50.io/dining)
const DINING_HALLS = [
  { id: 30, name: "Annenberg Hall" },
  { id: 9,  name: "Adams House" },
  { id: 5,  name: "Cabot & Pforzheimer" },
  { id: 38, name: "Currier House" },
  { id: 7,  name: "Dunster & Mather" },
  { id: 14, name: "Eliot & Kirkland" },
  { id: 16, name: "Leverett House" },
  { id: 8,  name: "Quincy House" },
]

const MEALS = [
  { id: 0, label: "Breakfast" },
  { id: 1, label: "Lunch" },
  { id: 2, label: "Dinner" },
]

const CS50_BASE = "https://api.cs50.io/dining"

// Cap per meal to keep total recipe fetches manageable (~75 max)
const MAX_PER_MEAL = 25

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

function parseGrams(val: { amount: string } | null | undefined): number {
  if (!val?.amount) return 0
  return Math.round(parseFloat(val.amount) || 0)
}

async function safeFetch(url: string, timeout = 8000): Promise<any | null> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal })
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
  const locationParam = searchParams.get("location") || "30"
  const locationId = parseInt(locationParam, 10)

  const hall = DINING_HALLS.find(h => h.id === locationId)
  if (!hall) {
    return NextResponse.json({ error: "Invalid dining hall" }, { status: 400 })
  }

  const fallback = { error: "Failed to fetch menu", meals: [], diningHalls: DINING_HALLS.map(h => ({ slug: String(h.id), name: h.name })) }

  try {
    // Fetch menu entries + categories in parallel
    const [menuData, catData] = await Promise.all([
      safeFetch(`${CS50_BASE}/menus?location=${locationId}&date=${date}`),
      safeFetch(`${CS50_BASE}/categories`),
    ])

    if (!Array.isArray(menuData) || menuData.length === 0) {
      return NextResponse.json({ date, location: hall.name, locationSlug: String(locationId), meals: [], diningHalls: DINING_HALLS.map(h => ({ slug: String(h.id), name: h.name })) })
    }

    const catMap = new Map<number, string>(
      Array.isArray(catData) ? catData.map((c: any) => [c.id, c.name]) : []
    )

    // Group entries by meal, capping at MAX_PER_MEAL unique recipes each
    type Entry = { category: number; recipe: number }
    const byMeal = new Map<number, Entry[]>()
    for (const entry of menuData as any[]) {
      if (!byMeal.has(entry.meal)) byMeal.set(entry.meal, [])
      byMeal.get(entry.meal)!.push({ category: entry.category, recipe: entry.recipe })
    }

    // Collect up to MAX_PER_MEAL unique recipe IDs per meal
    const neededRecipes = new Map<number, Entry & { meal: number }>()
    for (const [mealId, entries] of byMeal) {
      const seen = new Set<number>()
      for (const e of entries) {
        if (seen.size >= MAX_PER_MEAL) break
        if (!seen.has(e.recipe)) {
          seen.add(e.recipe)
          neededRecipes.set(e.recipe, { ...e, meal: mealId })
        }
      }
    }

    // Fetch all needed recipes in one parallel batch
    const recipeIds = [...neededRecipes.keys()]
    const recipeResults = await Promise.allSettled(
      recipeIds.map(id => safeFetch(`${CS50_BASE}/recipes/${id}`, 5000))
    )

    const recipeMap = new Map<number, any>()
    recipeIds.forEach((id, i) => {
      const r = recipeResults[i]
      if (r.status === "fulfilled" && r.value?.name) recipeMap.set(id, r.value)
    })

    // Assemble meals, preserving original entry order for section grouping
    const meals = []
    for (const { id: mealId, label: mealLabel } of MEALS) {
      const entries = byMeal.get(mealId) ?? []
      const items: MenuItem[] = []
      const seenNames = new Set<string>()

      for (const entry of entries) {
        const recipe = recipeMap.get(entry.recipe)
        if (!recipe) continue
        const key = recipe.name.toLowerCase()
        if (seenNames.has(key)) continue
        seenNames.add(key)

        items.push({
          id: recipe.id,
          menuItemId: entry.recipe,
          name: recipe.name,
          calories: recipe.calories ?? 0,
          proteinG: parseGrams(recipe.protein),
          fatG: parseGrams(recipe.total_fat),
          carbsG: parseGrams(recipe.total_carb),
          servingSize: recipe.serving_size ?? undefined,
          section: catMap.get(entry.category) ?? undefined,
        })
      }

      if (items.length > 0) meals.push({ mealType: mealLabel, items })
    }

    return NextResponse.json({
      date,
      location: hall.name,
      locationSlug: String(locationId),
      meals,
      diningHalls: DINING_HALLS.map(h => ({ slug: String(h.id), name: h.name })),
    })
  } catch (error) {
    console.error("Harvard menu fetch error:", error)
    return NextResponse.json(fallback, { status: 500 })
  }
}
