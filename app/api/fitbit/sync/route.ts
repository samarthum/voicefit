import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  errorResponse,
  getCurrentUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { fetchDailyActivitySummary, refreshAccessToken } from "@/lib/fitbit";

const REFRESH_BUFFER_MS = 60 * 1000;
const SYNC_COOLDOWN_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? new Date().toLocaleDateString("en-CA");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return errorResponse("Date must be YYYY-MM-DD format");
    }

    const connection = await prisma.fitbitConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection) {
      return successResponse({ synced: false, reason: "not-connected" });
    }

    if (connection.lastSyncAt) {
      const elapsed = Date.now() - connection.lastSyncAt.getTime();
      if (elapsed < SYNC_COOLDOWN_MS) {
        return successResponse({
          synced: false,
          reason: "throttled",
          lastSyncAt: connection.lastSyncAt,
        });
      }
    }

    let accessToken = connection.accessToken;

    if (connection.expiresAt.getTime() <= Date.now() + REFRESH_BUFFER_MS) {
      const refreshed = await refreshAccessToken(connection.refreshToken);
      accessToken = refreshed.access_token;

      await prisma.fitbitConnection.update({
        where: { userId: user.id },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token ?? connection.refreshToken,
          scope: refreshed.scope ?? connection.scope,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    }

    const summary = await fetchDailyActivitySummary(accessToken, date);

    if (summary.steps !== null) {
      await prisma.dailyMetric.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date,
          },
        },
        create: {
          userId: user.id,
          date,
          steps: summary.steps,
        },
        update: {
          steps: summary.steps,
        },
      });
    }

    const now = new Date();
    await prisma.fitbitConnection.update({
      where: { userId: user.id },
      data: { lastSyncAt: now },
    });

    return successResponse({
      synced: true,
      date,
      steps: summary.steps,
      lastSyncAt: now,
    });
  } catch (error) {
    console.error("Fitbit sync error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    return errorResponse("Failed to sync Fitbit steps", 500);
  }
}
