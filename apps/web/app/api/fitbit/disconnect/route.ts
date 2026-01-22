import { prisma } from "@/lib/db";
import {
  errorResponse,
  getCurrentUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { revokeToken } from "@/lib/fitbit";

export async function POST() {
  try {
    const user = await getCurrentUser();
    const connection = await prisma.fitbitConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection) {
      return successResponse({ disconnected: true });
    }

    try {
      await revokeToken(connection.refreshToken);
    } catch (error) {
      console.error("Fitbit revoke failed:", error);
    }

    await prisma.fitbitConnection.delete({
      where: { userId: user.id },
    });

    return successResponse({ disconnected: true });
  } catch (error) {
    console.error("Fitbit disconnect error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to disconnect Fitbit", 500);
  }
}
