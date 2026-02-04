import { NextRequest } from "next/server";
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  getCurrentUser,
} from "@/lib/api-helpers";
import { assistantChatRequestSchema } from "@/lib/validations";
import { runAssistantChat } from "@/lib/assistant/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const parseResult = assistantChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0].message);
    }

    const { message, timezone } = parseResult.data;

    const result = await runAssistantChat({
      userId: user.id,
      message,
      timezone,
    });

    return successResponse(result);
  } catch (error) {
    console.error("Assistant chat error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to respond. Please try again.";
    return errorResponse(message, 500);
  }
}
