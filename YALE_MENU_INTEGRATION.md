# Yale Menu Integration Guide

This document explains how to integrate with Yale Dining menus via the Nutrislice API.

## Overview

Yale Dining uses **Nutrislice** for menu management. The API is publicly accessible and provides menu items with full nutrition data.

## API Base URL

```
https://yaledining.api.nutrislice.com/menu/api
```

## Required Headers

```typescript
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://yaledining.nutrislice.com/"
};
```

## API Endpoints

### 1. Weekly Menu (Get Menu Structure)

```
GET /weeks/school/{school-slug}/menu-type/{meal-type}/{year}/{month}/{day}
```

**Parameters:**
- `school-slug`: Dining location (e.g., `jonathan-edwards-college`, `branford-college`)
- `meal-type`: `breakfast`, `lunch`, `dinner`, or `additional-dinner-offerings`
- `year/month/day`: Date for the week to fetch

**Example:**
```
GET /weeks/school/jonathan-edwards-college/menu-type/dinner/2024/12/15
```

**Response Structure:**
```json
{
  "days": [
    {
      "date": "2024-12-15",
      "menu_items": [
        {
          "id": 123456,
          "food": {
            "id": 789,
            "name": "Grilled Chicken"
          }
        }
      ]
    }
  ]
}
```

### 2. Nutrition Data (Per Item)

```
GET /menu-items/{menuItemId}/order-settings/?date={YYYY-MM-DD}&location_id={locationId}
```

**Parameters:**
- `menuItemId`: The menu item ID from the weekly menu response
- `date`: Date in YYYY-MM-DD format
- `location_id`: Optional location ID for the dining hall

**Response Structure:**
```json
{
  "tax_nutrition_info": {
    "calories": 350,
    "g_protein": 28,
    "g_fat": 12,
    "g_carbs": 25,
    "mg_sodium": 580,
    "serving_size_info": "1 serving (6 oz)"
  },
  "raw_nutrition_info": {
    // Same structure, used as fallback
  }
}
```

### 3. Item Metadata (Name & Description)

**From Menu Item:**
```
GET /menu-items/{menuItemId}/
```

**From Food (fallback):**
```
GET /foods/{foodId}/
```

**Response:**
```json
{
  "name": "Grilled Chicken Breast",
  "description": "Herb-seasoned grilled chicken",
  "food": {
    "id": 789,
    "name": "Grilled Chicken Breast"
  }
}
```

## Dining Locations

| Slug | Label | Location ID |
|------|-------|-------------|
| `jonathan-edwards-college` | Jonathan Edwards College | `57753` |
| `branford-college` | Branford College | (resolved dynamically) |

To find location IDs, fetch the locations directory:
```
GET /digest/school/{school-slug}/directory
```

## Meal Type Configuration

```typescript
const MEAL_TYPES = {
  breakfast: {
    label: "Breakfast",
    slugs: ["breakfast"]
  },
  lunch: {
    label: "Lunch",
    slugs: ["lunch"]
  },
  dinner: {
    label: "Dinner",
    slugs: ["dinner", "additional-dinner-offerings"]  // Note: dinner has two slugs
  }
};
```

## Data Types

### MenuItem

```typescript
type MenuItem = {
  id: number;
  menuItemId?: number;
  name: string;
  description?: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  sodiumMg: number;
  servingSize: string | undefined;
  nutritionFacts: NutritionFact[];
};
```

### NutritionFact

```typescript
type NutritionFact = {
  name: string;      // e.g., "Calories", "Protein"
  amount?: number;   // Numeric value
  unit?: string;     // e.g., "g", "mg"
  display?: string;  // Formatted: "25 g"
};
```

## Implementation Flow

```
1. User requests menu for a date
   ↓
2. For each dining location:
   ├── For each meal type (breakfast, lunch, dinner):
   │   ├── Fetch weekly menu from /weeks/school/{slug}/menu-type/{meal}/...
   │   ├── Filter to requested date
   │   └── For each menu item:
   │       ├── Fetch item metadata (name, description)
   │       └── Fetch nutrition from /order-settings
   ↓
3. Aggregate and deduplicate items
   ↓
4. Return structured response
```

## Example Implementation

### Fetching a Menu

```typescript
async function fetchMenu(date: string, location: string, meal: string) {
  const [year, month, day] = date.split('-');

  const response = await fetch(
    `https://yaledining.api.nutrislice.com/menu/api/weeks/school/${location}/menu-type/${meal}/${year}/${month}/${day}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://yaledining.nutrislice.com/"
      }
    }
  );

  const data = await response.json();

  // Find the day matching our date
  const dayData = data.days?.find((d: any) => d.date === date);

  return dayData?.menu_items || [];
}
```

### Fetching Nutrition

```typescript
async function fetchNutrition(menuItemId: number, date: string, locationId?: string) {
  const params = new URLSearchParams({ date });
  if (locationId) params.append('location_id', locationId);

  const response = await fetch(
    `https://yaledining.api.nutrislice.com/menu/api/menu-items/${menuItemId}/order-settings/?${params}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://yaledining.nutrislice.com/"
      }
    }
  );

  const data = await response.json();
  const nutrition = data.tax_nutrition_info || data.raw_nutrition_info || {};

  return {
    calories: nutrition.calories || 0,
    proteinG: nutrition.g_protein || 0,
    fatG: nutrition.g_fat || 0,
    carbsG: nutrition.g_carbs || 0,
    sodiumMg: nutrition.mg_sodium || 0,
    servingSize: nutrition.serving_size_info
  };
}
```

## Error Handling

- **Timeouts**: Use 8-10 second timeout for API calls
- **Missing Data**: Return empty arrays/objects rather than throwing
- **Partial Failures**: If one location fails, still return data from others
- **Caching**: Cache item metadata within a request to avoid duplicate calls

```typescript
// In-memory cache for item metadata (per request)
const itemMetaCache = new Map<string, { name: string; description?: string }>();

async function getItemMeta(menuItemId: number) {
  const cacheKey = `menuItem-${menuItemId}`;

  if (itemMetaCache.has(cacheKey)) {
    return itemMetaCache.get(cacheKey);
  }

  const meta = await fetchItemMetadata(menuItemId);
  itemMetaCache.set(cacheKey, meta);

  return meta;
}
```

## Response Format

```typescript
type MenuResponse = {
  date: string;
  source: "live" | "fallback";
  menu: {
    location: string;
    meals: {
      mealType: string;
      items: MenuItem[];
    }[];
  }[];
  error?: string;
};
```

## Notes

- The API returns weekly data; filter client-side for the specific date
- Dinner menus may come from multiple slugs (`dinner` + `additional-dinner-offerings`)
- Some items may not have nutrition data available
- Location IDs can be resolved dynamically from the directory endpoint
- The API is rate-limited; implement caching for production use

## Reference Implementation

See the full implementation in:
- **API Route**: `src/app/api/yale-menu/route.ts`
- **Frontend**: `src/app/fuel/page.tsx` (Dining Menus tab)
