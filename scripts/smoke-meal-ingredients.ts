/**
 * Phase 1.7 smoke test: end-to-end interpret -> persist -> read for the new
 * per-ingredient meal pipeline. Exercises both the LLM agent loop (USDA + IFCT
 * tools) and the new MealIngredient persistence path.
 *
 * Run: bun --env-file=.env scripts/smoke-meal-ingredients.ts
 *
 * Cleans up after itself (deletes the meal it created).
 */

import { interpretMeal } from "../lib/interpretation";
import { prisma } from "../lib/db";

const USER_ID = "cmk4bxqu4000204jv30l7sgoh";
const TRANSCRIPT = "paneer butter masala with two rotis and a mango lassi at a restaurant";

async function main() {
  const t0 = Date.now();
  console.log("→ interpretMeal:", JSON.stringify({ transcript: TRANSCRIPT }));

  const interpretation = await interpretMeal({
    userId: USER_ID,
    transcript: TRANSCRIPT,
  });
  const t1 = Date.now();
  console.log(`← interpretMeal returned in ${t1 - t0}ms`);
  console.log(JSON.stringify(interpretation, null, 2));

  // Sanity: ingredient sums match top-level (within ±2 per macro for rounding).
  const sum = interpretation.ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      proteinG: acc.proteinG + ing.proteinG,
      carbsG: acc.carbsG + ing.carbsG,
      fatG: acc.fatG + ing.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
  console.log("Sums vs totals:", {
    calories: [sum.calories, interpretation.calories],
    proteinG: [sum.proteinG, interpretation.proteinG],
    carbsG: [sum.carbsG, interpretation.carbsG],
    fatG: [sum.fatG, interpretation.fatG],
  });

  // Persist via the same shape the POST handler builds (nested create).
  console.log("→ prisma.mealLog.create with nested ingredients");
  const meal = await prisma.mealLog.create({
    data: {
      userId: USER_ID,
      eatenAt: new Date(),
      mealType: interpretation.mealType,
      description: interpretation.description,
      calories: interpretation.calories,
      proteinG: interpretation.proteinG,
      carbsG: interpretation.carbsG,
      fatG: interpretation.fatG,
      transcriptRaw: TRANSCRIPT,
      ingredients: {
        create: interpretation.ingredients.map((ing, i) => ({
          position: i,
          name: ing.name,
          grams: ing.grams,
          calories: ing.calories,
          proteinG: ing.proteinG,
          carbsG: ing.carbsG,
          fatG: ing.fatG,
        })),
      },
    },
    include: { ingredients: { orderBy: { position: "asc" } } },
  });
  console.log(`← created meal id=${meal.id} with ${meal.ingredients.length} ingredients`);
  console.log(
    "Persisted ingredients:",
    meal.ingredients.map((i) => ({ pos: i.position, name: i.name, grams: i.grams, kcal: i.calories }))
  );

  // Read back via the same query the GET handler uses.
  const readBack = await prisma.mealLog.findUnique({
    where: { id: meal.id },
    include: { ingredients: { orderBy: { position: "asc" } } },
  });
  if (!readBack) throw new Error("read-back failed: meal not found");
  if (readBack.ingredients.length !== interpretation.ingredients.length) {
    throw new Error(
      `ingredient count drift: persisted ${interpretation.ingredients.length}, read ${readBack.ingredients.length}`
    );
  }
  for (let i = 0; i < readBack.ingredients.length; i++) {
    if (readBack.ingredients[i].position !== i) {
      throw new Error(`position drift at index ${i}: ${readBack.ingredients[i].position}`);
    }
  }
  console.log("✓ read-back order preserved by position");

  // Cleanup.
  await prisma.mealLog.delete({ where: { id: meal.id } });
  console.log("✓ cleaned up test meal");

  await prisma.$disconnect();
  console.log(`\n✓ smoke test passed in ${Date.now() - t0}ms`);
}

main().catch(async (err) => {
  console.error("✗ smoke test failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
