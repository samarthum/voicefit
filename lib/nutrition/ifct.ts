/**
 * Indian Food Composition Tables (IFCT 2017) lookup.
 *
 * Why bundle statically: IFCT 2017 has no public API. We ship the dataset
 * with the app via the `ifct2017` npm package, which embeds the official
 * CSV from ICMR-NIN. IFCT is the authoritative reference for South Asian
 * ingredients (lab-analyzed, peer-reviewed methodology — Longvah et al.,
 * Food Chemistry 2017) where USDA FoodData Central has weak coverage.
 *
 * Coverage limitation: 528 raw / minimally-processed ingredients only —
 * paneer, ghee, atta, dals, regional vegetables, etc. Composite Indian
 * dishes (biryani, dal tadka, dosa, masala chai) are NOT in this dataset.
 * The LLM agent is responsible for decomposing such dishes into their
 * ingredient components before calling `lookupIfct`.
 *
 * Source: `ifct2017` npm package (v2.0.x, https://www.npmjs.com/package/ifct2017),
 * which re-exports the upstream `@ifct2017/compositions` CSV. We parse the
 * CSV once at module load and run our own lightweight fuzzy matcher rather
 * than relying on the package's lunr-backed search, so we have full control
 * over scoring and can return per-100g + scaled values uniformly.
 *
 * Energy quirk: IFCT publishes `Energy (enerc)` in kJ/100g, not kcal. We
 * convert via 1 kcal = 4.184 kJ. Some rows (notably pure fats like ghee)
 * have enerc=0 in the CSV; in that case we fall back to Atwater factors
 * (4/4/9 kcal per g of protein/carbs/fat) computed from the macros, which
 * are themselves directly populated.
 */
import { readFileSync } from "node:fs";
import compositions from "@ifct2017/compositions";

export interface IfctResult {
  /** IFCT food code, e.g. "L003" for Paneer. */
  code: string;
  /** Canonical food name from IFCT, e.g. "Paneer" or "Red gram, dal". */
  name: string;
  /** Mass these nutrient values reflect. 100 if unscaled; otherwise the `grams` parameter. */
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface IfctRow {
  code: string;
  name: string;
  /** Lower-cased tokens from the food name, used for primary fuzzy matching. */
  tokens: string[];
  /** Lower-cased full name for substring tests. */
  nameLower: string;
  /** Tokens from scientific + vernacular names, used as a weaker secondary signal. */
  altTokens: Set<string>;
  /** kcal/100g (already converted from kJ, with Atwater fallback). */
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
}

// Column indices in the IFCT compositions CSV (verified against the header).
const COL_CODE = 0;
const COL_NAME = 1;
const COL_SCIE = 2;
const COL_LANG = 3;
const COL_ENERC_KJ = 7;
const COL_FAT = 15;
const COL_CARBS = 21;
const COL_PROTEIN = 23;

const KJ_PER_KCAL = 4.184;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 2);
}

function toNumber(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function loadCorpus(): IfctRow[] {
  const csvPath = compositions.csv();
  const text = readFileSync(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const rows: IfctRow[] = [];
  // Skip the header row.
  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line);
    if (cols.length < COL_PROTEIN + 1) continue;
    const code = cols[COL_CODE];
    const name = cols[COL_NAME];
    const scie = cols[COL_SCIE] ?? "";
    const lang = cols[COL_LANG] ?? "";
    const enercKj = toNumber(cols[COL_ENERC_KJ]);
    const protein = toNumber(cols[COL_PROTEIN]);
    const carbs = toNumber(cols[COL_CARBS]);
    const fat = toNumber(cols[COL_FAT]);

    // Prefer the published kJ value, falling back to Atwater 4/4/9 when the
    // CSV reports enerc=0 (e.g. pure fats like ghee, where IFCT omitted it).
    const caloriesFromKj = enercKj > 0 ? enercKj / KJ_PER_KCAL : 0;
    const caloriesAtwater = protein * 4 + carbs * 4 + fat * 9;
    const caloriesPer100 = caloriesFromKj > 0 ? caloriesFromKj : caloriesAtwater;

    // The `lang` column packs vernacular names with letter prefixes
    // ("H. Arhar dal; Tam. Tuvaramparuppu; ..."). We strip the prefixes
    // and treat the remaining words as alternative search tokens so that
    // queries like "toor dal" can find "Red gram, dal" via "Tuvar".
    const langClean = lang
      .replace(/\b[A-Z][a-z]?\.\s*/g, " ")
      .replace(/\[[^\]]*\]/g, " ");
    const altTokens = new Set<string>([
      ...tokenize(scie),
      ...tokenize(langClean),
    ]);

    rows.push({
      code,
      name,
      nameLower: name.toLowerCase(),
      tokens: tokenize(name),
      altTokens,
      caloriesPer100,
      proteinPer100: protein,
      carbsPer100: carbs,
      fatPer100: fat,
    });
  }
  return rows;
}

// Lazy + memoized: the dataset is ~528 rows so parsing is cheap, but eager
// load at module init crashes Next.js's "collect page data" build step,
// which imports route modules without the CSV present on disk.
let CORPUS: IfctRow[] | null = null;
function getCorpus(): IfctRow[] {
  if (CORPUS === null) CORPUS = loadCorpus();
  return CORPUS;
}

/**
 * Score a single IFCT row against the tokenized query.
 *
 * Combines two signals:
 *  - substring presence (full query appears verbatim in the name) — strong boost
 *  - shared-token count between query and name tokens
 *
 * Higher is better. Returns -1 to indicate "no overlap" so the caller can
 * filter such rows out.
 */
function scoreRow(row: IfctRow, queryLower: string, queryTokens: string[]): number {
  let score = 0;

  // Whole-query substring is a strong signal.
  if (row.nameLower.includes(queryLower)) {
    score += 10;
    // Bonus for matching at the start of the name (e.g. "paneer" → "Paneer").
    if (row.nameLower.startsWith(queryLower)) score += 3;
  }

  // Shared-token count against the canonical name.
  const nameTokenSet = new Set(row.tokens);
  let shared = 0;
  for (const t of queryTokens) {
    if (nameTokenSet.has(t)) shared++;
    // Per-token substring (e.g. "dal" matches "dals" or vice versa).
    else if (row.tokens.some((nt) => nt.includes(t) || t.includes(nt))) shared += 0.5;
  }
  score += shared * 2;

  // Weaker secondary signal: tokens from scientific and vernacular names.
  // This lets "toor dal" match "Red gram, dal" via Tamil "tuvar"/Hindi "arhar".
  let altShared = 0;
  for (const t of queryTokens) {
    if (row.altTokens.has(t)) altShared++;
    else {
      for (const at of row.altTokens) {
        if (at.includes(t) || t.includes(at)) {
          altShared += 0.5;
          break;
        }
      }
    }
  }
  score += altShared * 1;

  // Penalize very long names slightly so a tight match wins over a verbose one.
  if (score > 0) score -= row.tokens.length * 0.05;

  return score > 0 ? score : -1;
}

/**
 * Search IFCT 2017 for an ingredient.
 *
 * Runs a lowercase substring + token-overlap fuzzy match against the 528-food
 * corpus and returns the top `limit` matches (default 5). When `grams` is
 * provided, calories and macros are scaled linearly from per-100g and rounded
 * to integers; otherwise the raw per-100g values are returned with `grams: 100`.
 *
 * @param query - free-form ingredient name (e.g. "paneer", "toor dal", "ghee").
 * @param options.grams - optional mass (g) to scale to.
 * @param options.limit - max results; defaults to 5.
 */
export function lookupIfct(
  query: string,
  options?: { grams?: number; limit?: number },
): IfctResult[] {
  const limit = Math.max(1, Math.floor(options?.limit ?? 5));
  const grams = options?.grams;
  const queryLower = query.trim().toLowerCase();
  const queryTokens = tokenize(query);
  if (queryLower.length === 0) return [];

  const scored: { row: IfctRow; score: number }[] = [];
  for (const row of getCorpus()) {
    const s = scoreRow(row, queryLower, queryTokens);
    if (s > 0) scored.push({ row, score: s });
  }
  scored.sort((a, b) => b.score - a.score);

  const scale = typeof grams === "number" && grams > 0 ? grams / 100 : 1;
  const reportedGrams = typeof grams === "number" && grams > 0 ? grams : 100;

  return scored.slice(0, limit).map(({ row }) => ({
    code: row.code,
    name: row.name,
    grams: reportedGrams,
    calories: Math.round(row.caloriesPer100 * scale),
    proteinG: Math.round(row.proteinPer100 * scale),
    carbsG: Math.round(row.carbsPer100 * scale),
    fatG: Math.round(row.fatPer100 * scale),
  }));
}
