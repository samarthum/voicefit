/**
 * USDA FoodData Central (FDC) client.
 *
 * Why USDA: it is the free, authoritative reference dataset for nutrient
 * composition with transparent provenance (Foundation Foods, SR Legacy,
 * FNDDS, Branded). Alternative options like CalorieNinjas were considered
 * and rejected because their data sourcing is undocumented.
 *
 * Search-first design: we deliberately expose `searchUsda` + `getUsdaNutrients`
 * as two separate tools rather than wrapping a natural-language endpoint.
 * The LLM agent handles disambiguation in its own reasoning step (e.g.
 * picking "raw" vs "cooked", whole-food vs branded) before fetching nutrients.
 *
 * Per-100g caveat: FDC reports raw/whole foods per 100g. Branded items are
 * sometimes reported per labeled serving. For v1 we treat every response as
 * per-100g and document this limitation; revisit when branded usage is large.
 */
import { env } from "process";

const FDC_BASE_URL = "https://api.nal.usda.gov/fdc";

function getApiKey(): string {
  const key = env.USDA_API_KEY;
  if (!key) {
    throw new Error(
      "USDA_API_KEY is not set. Add it to voicefit/.env before calling the USDA client.",
    );
  }
  return key;
}

export interface UsdaSearchResult {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodCategory?: string;
}

export interface UsdaNutrients {
  fdcId: number;
  description: string;
  /** Mass these nutrient values reflect. 100 if unscaled; otherwise the `grams` parameter. */
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface FdcSearchFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodCategory?: string;
}

interface FdcFoodNutrient {
  nutrient?: { name?: string; unitName?: string };
  // Some FDC responses flatten these onto the entry itself.
  nutrientName?: string;
  unitName?: string;
  amount?: number;
  value?: number;
}

interface FdcFoodResponse {
  fdcId: number;
  description: string;
  foodNutrients?: FdcFoodNutrient[];
}

/**
 * Search FDC for candidate foods matching `query`.
 *
 * @param query - free-form food name (e.g. "chicken breast raw").
 * @param pageSize - max results to return; defaults to 5, capped at 25.
 * @returns up to `pageSize` candidate foods with enough metadata for the
 *          model to disambiguate before calling `getUsdaNutrients`.
 */
export async function searchUsda(
  query: string,
  pageSize: number = 5,
): Promise<UsdaSearchResult[]> {
  const apiKey = getApiKey();
  const size = Math.min(Math.max(1, Math.floor(pageSize)), 25);
  const url = new URL(`${FDC_BASE_URL}/v1/foods/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(size));
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`USDA API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { foods?: FdcSearchFood[] };
  const foods = json.foods ?? [];
  return foods.map((f) => ({
    fdcId: f.fdcId,
    description: f.description,
    dataType: f.dataType,
    brandOwner: f.brandOwner,
    foodCategory: f.foodCategory,
  }));
}

/**
 * Fetch calories + macros for a specific FDC food.
 *
 * Values are normalized per 100g. If `grams` is provided, calories and
 * macros are scaled linearly and rounded to integers. If absent, the raw
 * per-100g values are returned with `grams: 100`.
 *
 * Limitation: branded items occasionally report nutrients per labeled
 * serving rather than per 100g. We treat all responses as per-100g for v1.
 *
 * @param fdcId - FDC identifier from `searchUsda`.
 * @param grams - optional mass to scale to.
 */
export async function getUsdaNutrients(
  fdcId: number,
  grams?: number,
): Promise<UsdaNutrients> {
  const apiKey = getApiKey();
  const url = new URL(`${FDC_BASE_URL}/v1/food/${fdcId}`);
  url.searchParams.set("api_key", apiKey);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`USDA API error ${res.status}: ${body}`);
  }

  const food = (await res.json()) as FdcFoodResponse;
  const nutrients = food.foodNutrients ?? [];

  const findAmount = (predicate: (name: string, unit: string) => boolean): number => {
    for (const entry of nutrients) {
      const name = (entry.nutrient?.name ?? entry.nutrientName ?? "").trim();
      const unit = (entry.nutrient?.unitName ?? entry.unitName ?? "").trim();
      const amount = entry.amount ?? entry.value;
      if (typeof amount === "number" && predicate(name, unit)) {
        return amount;
      }
    }
    return 0;
  };

  // Energy: prefer kcal. Two common names: "Energy" and "Energy (Atwater Specific Factors)".
  const caloriesPer100 = findAmount(
    (name, unit) => name.toLowerCase().startsWith("energy") && unit.toUpperCase() === "KCAL",
  );
  const proteinPer100 = findAmount((name) => name === "Protein");
  const carbsPer100 = findAmount((name) => name === "Carbohydrate, by difference");
  const fatPer100 = findAmount((name) => name === "Total lipid (fat)");

  const scale = typeof grams === "number" && grams > 0 ? grams / 100 : 1;
  const reportedGrams = typeof grams === "number" && grams > 0 ? grams : 100;

  return {
    fdcId: food.fdcId,
    description: food.description,
    grams: reportedGrams,
    calories: Math.round(caloriesPer100 * scale),
    proteinG: Math.round(proteinPer100 * scale),
    carbsG: Math.round(carbsPer100 * scale),
    fatG: Math.round(fatPer100 * scale),
  };
}
