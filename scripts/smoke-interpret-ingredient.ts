/**
 * Phase 3A smoke test: single-ingredient interpretation. Exercises the
 * IFCT + USDA tool path for the narrower `interpretIngredient` agent the
 * mobile review sheet calls when a user renames a row or adds a new one.
 *
 * Run: unset ANTHROPIC_API_KEY && set -a && source .env && set +a && \
 *      bun scripts/smoke-interpret-ingredient.ts
 *
 * Three cases:
 *   - paneer 100g  → IFCT, ~265 kcal, ~18p / ~12c / ~20f
 *   - chicken breast (no grams) → model picks serving, sane macros
 *   - ghee 15g     → IFCT, ~135 kcal, ~0p / ~0c / ~15f
 */

import { interpretIngredient } from "../lib/interpretation";
import { prisma } from "../lib/db";

interface Case {
  label: string;
  input: { name: string; grams?: number };
  expect?: {
    caloriesAround?: number;
    proteinAround?: number;
    carbsAround?: number;
    fatAround?: number;
    tolerance?: number; // absolute, default 25 kcal / 5g
  };
}

const CASES: Case[] = [
  {
    label: "paneer 100g (IFCT)",
    input: { name: "paneer", grams: 100 },
    expect: { caloriesAround: 265, proteinAround: 18, carbsAround: 12, fatAround: 20 },
  },
  {
    label: "chicken breast (no grams)",
    input: { name: "chicken breast" },
  },
  {
    label: "ghee 15g (IFCT)",
    input: { name: "ghee", grams: 15 },
    expect: { caloriesAround: 135, proteinAround: 0, carbsAround: 0, fatAround: 15 },
  },
];

function near(actual: number, expected: number | undefined, tol: number) {
  if (expected === undefined) return true;
  return Math.abs(actual - expected) <= tol;
}

async function runCase(c: Case) {
  console.log(`\n→ ${c.label}: ${JSON.stringify(c.input)}`);
  const t0 = Date.now();
  const result = await interpretIngredient(c.input);
  const dt = Date.now() - t0;
  console.log(`← ${dt}ms`);
  console.log(JSON.stringify(result, null, 2));

  // Sanity checks.
  if (typeof result.grams !== "number" || result.grams <= 0) {
    throw new Error(`grams missing/invalid: ${result.grams}`);
  }
  if (typeof result.calories !== "number" || result.calories < 0) {
    throw new Error(`calories missing/invalid: ${result.calories}`);
  }
  if (c.expect) {
    const calTol = c.expect.tolerance ?? 30;
    const macroTol = 5;
    if (!near(result.calories, c.expect.caloriesAround, calTol)) {
      console.warn(
        `  ⚠ calories ${result.calories} out of ±${calTol} from expected ${c.expect.caloriesAround}`,
      );
    }
    if (!near(result.proteinG, c.expect.proteinAround, macroTol)) {
      console.warn(
        `  ⚠ protein ${result.proteinG}g out of ±${macroTol} from expected ${c.expect.proteinAround}g`,
      );
    }
    if (!near(result.carbsG, c.expect.carbsAround, macroTol)) {
      console.warn(
        `  ⚠ carbs ${result.carbsG}g out of ±${macroTol} from expected ${c.expect.carbsAround}g`,
      );
    }
    if (!near(result.fatG, c.expect.fatAround, macroTol)) {
      console.warn(
        `  ⚠ fat ${result.fatG}g out of ±${macroTol} from expected ${c.expect.fatAround}g`,
      );
    }
  }
  return { ms: dt, result };
}

async function main() {
  const t0 = Date.now();
  for (const c of CASES) {
    await runCase(c);
  }
  await prisma.$disconnect();
  console.log(`\n✓ smoke test passed in ${Date.now() - t0}ms`);
}

main().catch(async (err) => {
  console.error("✗ smoke test failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
