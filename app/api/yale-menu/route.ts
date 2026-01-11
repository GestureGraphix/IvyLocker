import { NextResponse } from "next/server"

// Yale Dining locations
const DINING_HALLS = [
  { slug: "jonathan-edwards-college", name: "Jonathan Edwards", id: "57753" },
  { slug: "branford-college", name: "Branford" },
  { slug: "berkeley-college", name: "Berkeley" },
  { slug: "calhoun-college", name: "Hopper" },
  { slug: "davenport-college", name: "Davenport" },
  { slug: "morse-college", name: "Morse" },
  { slug: "pierson-college", name: "Pierson" },
  { slug: "saybrook-college", name: "Saybrook" },
  { slug: "silliman-college", name: "Silliman" },
  { slug: "stiles-college", name: "Stiles" },
  { slug: "timothy-dwight-college", name: "Timothy Dwight" },
  { slug: "trumbull-college", name: "Trumbull" },
  { slug: "benjamin-franklin-college", name: "Franklin" },
  { slug: "pauli-murray-college", name: "Murray" },
]

const MEAL_TYPES = [
  { slug: "breakfast", label: "Breakfast" },
  { slug: "lunch", label: "Lunch" },
  { slug: "dinner", label: "Dinner" },
]

const API_BASE = "https://yaledining.api.nutrislice.com/menu/api"

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://yaledining.nutrislice.com/",
}

interface MenuItem {
  id: number
  menuItemId: number
  name: string
  description?: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
  servingSize?: string
}

// Cache nutrition data for 1 hour (in-memory, resets on cold start)
const nutritionCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

async function fetchNutrition(menuItemId: number, date: string): Promise<Partial<MenuItem>> {
  const cacheKey = `${menuItemId}-${date}`

  // Check cache
  const cached = nutritionCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/menu-items/${menuItemId}/order-settings/?date=${date}`
    )

    if (!response.ok) {
      return { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 }
    }

    const data = await response.json()
    const nutrition = data.tax_nutrition_info || data.raw_nutrition_info || {}

    const result = {
      calories: nutrition.calories || 0,
      proteinG: nutrition.g_protein || 0,
      fatG: nutrition.g_fat || 0,
      carbsG: nutrition.g_carbs || 0,
      servingSize: nutrition.serving_size_info,
    }

    // Cache the result
    nutritionCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } catch {
    return { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 }
  }
}

async function fetchMenuForMeal(
  locationSlug: string,
  mealSlug: string,
  date: string
): Promise<MenuItem[]> {
  const [year, month, day] = date.split("-")

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/weeks/school/${locationSlug}/menu-type/${mealSlug}/${year}/${month}/${day}`
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const dayData = data.days?.find((d: any) => d.date === date)

    if (!dayData?.menu_items?.length) {
      return []
    }

    // Process menu items - fetch nutrition in parallel but limit concurrency
    const items: MenuItem[] = []
    const menuItems = dayData.menu_items.slice(0, 30) // Limit to 30 items per meal

    // Process in batches of 5 to avoid overwhelming the API
    for (let i = 0; i < menuItems.length; i += 5) {
      const batch = menuItems.slice(i, i + 5)
      const batchResults = await Promise.all(
        batch.map(async (item: any) => {
          const menuItemId = item.id
          const foodName = item.food?.name || item.name || "Unknown Item"

          const nutrition = await fetchNutrition(menuItemId, date)

          return {
            id: item.food?.id || menuItemId,
            menuItemId,
            name: foodName,
            description: item.food?.description,
            ...nutrition,
          } as MenuItem
        })
      )
      items.push(...batchResults)
    }

    // Filter out items with no nutrition data and duplicates
    const seen = new Set<string>()
    return items.filter((item) => {
      if (seen.has(item.name.toLowerCase())) return false
      seen.add(item.name.toLowerCase())
      return item.calories > 0 || item.proteinG > 0
    })
  } catch (error) {
    console.error(`Failed to fetch menu for ${locationSlug}/${mealSlug}:`, error)
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
  const location = searchParams.get("location") || "jonathan-edwards-college"
  const meal = searchParams.get("meal") // Optional: filter to specific meal

  try {
    const diningHall = DINING_HALLS.find((h) => h.slug === location)

    if (!diningHall) {
      return NextResponse.json({ error: "Invalid dining hall" }, { status: 400 })
    }

    // Fetch meals - either specific meal or all meals
    const mealsToFetch = meal
      ? MEAL_TYPES.filter((m) => m.slug === meal)
      : MEAL_TYPES

    const menuPromises = mealsToFetch.map(async (mealType) => {
      const items = await fetchMenuForMeal(location, mealType.slug, date)

      // For dinner, also fetch additional offerings
      if (mealType.slug === "dinner") {
        const additional = await fetchMenuForMeal(location, "additional-dinner-offerings", date)
        items.push(...additional)
      }

      return {
        mealType: mealType.label,
        items,
      }
    })

    const meals = await Promise.all(menuPromises)

    return NextResponse.json({
      date,
      location: diningHall.name,
      locationSlug: location,
      meals: meals.filter((m) => m.items.length > 0),
      diningHalls: DINING_HALLS.map((h) => ({ slug: h.slug, name: h.name })),
    })
  } catch (error) {
    console.error("Yale menu fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch menu", meals: [], diningHalls: DINING_HALLS },
      { status: 500 }
    )
  }
}
