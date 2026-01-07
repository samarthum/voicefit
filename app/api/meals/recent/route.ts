import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";

// GET /api/meals/recent - Get recent unique meals for quick-add
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);

    // Get recent meals, deduplicated by description
    const recentMeals = await prisma.mealLog.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { eatenAt: "desc" },
      take: 50, // Fetch more to deduplicate
      select: {
        id: true,
        description: true,
        calories: true,
        mealType: true,
        eatenAt: true,
      },
    });

    // Deduplicate by description (case-insensitive)
    const seen = new Set<string>();
    const uniqueMeals = recentMeals.filter((meal) => {
      const key = meal.description.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }).slice(0, limit);

    return successResponse(uniqueMeals);
  } catch (error) {
    console.error("Get recent meals error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to get recent meals", 500);
  }
}
