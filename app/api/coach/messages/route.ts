import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api-helpers";

// GET /api/coach/messages — return persisted thread for useChat's initialMessages
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const rows = await prisma.coachMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        toolCalls: true,
        createdAt: true,
      },
    });

    // Convert to a minimal shape the client can hydrate into useChat.
    // Full UIMessage reconstruction happens client-side; we just need
    // id, role, and parts (text content + stored tool calls).
    const messages = rows.map((row) => ({
      id: row.id,
      role: row.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: row.content }],
      createdAt: row.createdAt.toISOString(),
    }));

    return successResponse({ messages });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("GET /api/coach/messages error:", error);
    return errorResponse("Failed to load messages", 500);
  }
}
