import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  errorResponse,
  getCurrentUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const connection = await prisma.fitbitConnection.findUnique({
      where: { userId: user.id },
    });

    return successResponse({
      connected: Boolean(connection),
      fitbitUserId: connection?.fitbitUserId ?? null,
      scope: connection?.scope ?? null,
      lastSyncAt: connection?.lastSyncAt ?? null,
    });
  } catch (error) {
    console.error("Fitbit status error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to load Fitbit status", 500);
  }
}
