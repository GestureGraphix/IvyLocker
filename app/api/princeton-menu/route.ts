import { NextResponse } from "next/server"

const DINING_HALLS = [
  { slug: "01", name: "Rockefeller & Mathey" },
  { slug: "03", name: "Forbes College" },
  { slug: "04", name: "Graduate College" },
  { slug: "05", name: "Center for Jewish Life" },
  { slug: "06", name: "Yeh & New College West" },
  { slug: "08", name: "Whitman & Butler" },
]

const FOODPRO_BASE =
  "https://menus.princeton.edu/dining/_Foodpro/online-menu/menuDetails.asp"

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

// Princeton FoodPro dates use M/D/YYYY with no leading zeros
function toFoodproDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-")
  return `${parseInt(month)}%2F${parseInt(day)}%2F${year}`
}

async function safeFetch(url: string, timeout = 10000): Promise<string | null> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        Referer: "https://menus.princeton.edu/dining/_Foodpro/online-menu/",
      },
    })
    clearTimeout(id)
    if (!res.ok) return null
    return await res.text()
  } catch {
    clearTimeout(id)
    return null
  }
}

function parseNum(s: string): number {
  return parseFloat(s) || 0
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function parseMealCards(html: string): { mealType: string; items: MenuItem[] }[] {
  const meals: { mealType: string; items: MenuItem[] }[] = []

  // Find start positions of each meal card
  const cardRe = /<div class="card mealCard">/g
  const cardStarts: number[] = []
  let m: RegExpExecArray | null
  while ((m = cardRe.exec(html)) !== null) cardStarts.push(m.index)

  for (let ci = 0; ci < cardStarts.length; ci++) {
    const cardHtml = html.slice(
      cardStarts[ci],
      ci + 1 < cardStarts.length ? cardStarts[ci + 1] : html.length
    )

    // Meal type from card-header first text node
    const mealMatch = cardHtml.match(
      /<div class="card-header">\s*(Breakfast|Lunch|Dinner|Brunch)/i
    )
    if (!mealMatch) continue
    const mealType = mealMatch[1]

    const bodyStart = cardHtml.indexOf('<div class="card-body">')
    if (bodyStart === -1) continue
    const bodyHtml = cardHtml.slice(bodyStart)

    // Collect mealStation and accordion-item positions in document order
    const tokenRe =
      /(<div class="mealStation">|<div class="accordion-item tour-accordian">)/g
    const tokens: { pos: number; type: "station" | "item" }[] = []
    let t: RegExpExecArray | null
    while ((t = tokenRe.exec(bodyHtml)) !== null) {
      tokens.push({
        pos: t.index,
        type: t[1].includes("mealStation") ? "station" : "item",
      })
    }

    const items: MenuItem[] = []
    let currentStation = ""

    for (let i = 0; i < tokens.length; i++) {
      const nextPos =
        i + 1 < tokens.length ? tokens[i + 1].pos : bodyHtml.length
      const seg = bodyHtml.slice(tokens[i].pos, nextPos)

      if (tokens[i].type === "station") {
        const sm = seg.match(/<div class="mealStation">\s*([\s\S]*?)\s*<\/div>/)
        if (sm) currentStation = sm[1].replace(/<[^>]*>/g, "").trim()
      } else {
        const nameMatch = seg.match(/<span class="title">([\s\S]*?)<\/span>/)
        if (!nameMatch) continue
        const name = nameMatch[1].replace(/<[^>]*>/g, "").trim()
        if (!name) continue

        const recipeMatch = seg.match(/data-recipeid="([^"]+)"/)
        const menuItemId = recipeMatch
          ? parseInt(recipeMatch[1]) || hashCode(name)
          : hashCode(name)

        let calories = 0,
          proteinG = 0,
          fatG = 0,
          carbsG = 0,
          servingSize: string | undefined

        const nfMatch = seg.match(
          /<div class="nutritionFact">([\s\S]*?)<\/div>/
        )
        if (nfMatch) {
          const nf = nfMatch[1]
          const cal = nf.match(/Calories:<\/strong>&nbsp;([\d.]+)/)
          if (cal) calories = Math.round(parseNum(cal[1]))
          const fat = nf.match(/Total Fat:<\/strong>&nbsp;([\d.]+)/)
          if (fat) fatG = Math.round(parseNum(fat[1]))
          const prot = nf.match(/Protein:<\/strong>&nbsp;([\d.]+)/)
          if (prot) proteinG = Math.round(parseNum(prot[1]))
          const carb = nf.match(/Total Carbohydrates:<\/strong>&nbsp;([\d.]+)/)
          if (carb) carbsG = Math.round(parseNum(carb[1]))
          const serv = nf.match(
            /Serving Size:<\/strong>&nbsp;([^<\n]+?)(?:\s*<br|\s*$)/
          )
          if (serv) servingSize = serv[1].trim()
        }

        items.push({
          id: menuItemId,
          menuItemId,
          name,
          calories,
          proteinG,
          fatG,
          carbsG,
          servingSize,
          section: currentStation || undefined,
        })
      }
    }

    if (items.length > 0) meals.push({ mealType, items })
  }

  return meals
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0]
  const location = searchParams.get("location") || "01"

  const hall = DINING_HALLS.find((h) => h.slug === location)
  if (!hall) {
    return NextResponse.json({ error: "Invalid dining hall" }, { status: 400 })
  }

  const fallback = {
    error: "Failed to fetch menu",
    meals: [],
    diningHalls: DINING_HALLS.map((h) => ({ slug: h.slug, name: h.name })),
  }

  try {
    const url = `${FOODPRO_BASE}?myaction=read&dtdate=${toFoodproDate(date)}&locationNum=${location}`
    const html = await safeFetch(url)

    if (!html) return NextResponse.json(fallback, { status: 500 })

    const meals = parseMealCards(html)

    return NextResponse.json({
      date,
      location: hall.name,
      locationSlug: location,
      meals,
      diningHalls: DINING_HALLS.map((h) => ({ slug: h.slug, name: h.name })),
    })
  } catch (error) {
    console.error("Princeton menu fetch error:", error)
    return NextResponse.json(fallback, { status: 500 })
  }
}
