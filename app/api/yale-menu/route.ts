import { NextResponse } from "next/server"

// Yale Dining locations
const DINING_HALLS = [
  { slug: "jonathan-edwards-college", name: "Jonathan Edwards" },
  { slug: "branford-college", name: "Branford" },
  { slug: "berkeley-college", name: "Berkeley" },
  { slug: "calhoun-college", name: "Hopper" },
  { slug: "davenport-college", name: "Davenport" },
  { slug: "morse-college", name: "Morse" },
  { slug: "pierson-college", name: "Pierson" },
  { slug: "saybrook-college", name: "Saybrook" },
  { slug: "silliman-college", name: "Silliman" },
  { slug: "ezra-stiles-college", name: "Ezra Stiles" },
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
  section?: string
}

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
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
      console.error(`Failed to fetch menu: ${response.status}`)
      return []
    }

    const data = await response.json()
    const dayData = data.days?.find((d: any) => d.date === date)

    if (!dayData?.menu_items?.length) {
      return []
    }

    const items: MenuItem[] = []
    let currentSection = ""

    for (const item of dayData.menu_items) {
      // Track section headers
      if (item.is_section_title && item.text) {
        currentSection = item.text
        continue
      }

      const food = item.food
      if (!food || !food.name) continue

      // Get nutrition from rounded_nutrition_info (already in response)
      const nutrition = food.rounded_nutrition_info || {}

      items.push({
        id: food.id,
        menuItemId: item.id,
        name: food.name,
        description: food.description || undefined,
        calories: Math.round(nutrition.calories || 0),
        proteinG: Math.round(nutrition.g_protein || 0),
        fatG: Math.round(nutrition.g_fat || 0),
        carbsG: Math.round(nutrition.g_carbs || 0),
        servingSize: food.serving_size_info || undefined,
        section: currentSection || undefined,
      })
    }

    // Remove duplicates by name
    const seen = new Set<string>()
    return items.filter((item) => {
      const key = item.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch (error) {
    console.error(`Failed to fetch menu for ${locationSlug}/${mealSlug}:`, error)
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
  const location = searchParams.get("location") || "branford-college"
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
        // Add additional items, avoiding duplicates
        const existingNames = new Set(items.map(i => i.name.toLowerCase()))
        for (const item of additional) {
          if (!existingNames.has(item.name.toLowerCase())) {
            items.push(item)
          }
        }
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
