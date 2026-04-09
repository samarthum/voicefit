import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api-helpers";

// POST /api/coach/clear — delete all CoachMessage rows for the user. Facts are preserved.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const { count } = await prisma.coachMessage.deleteMany({
      where: { userId: user.id },
    });

    return successResponse({ deleted: count });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("POST /api/coach/clear error:", error);
    return errorResponse("Failed to clear conversation", 500);
  }
}
