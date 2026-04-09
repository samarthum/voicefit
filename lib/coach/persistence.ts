import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { StepResult } from "ai";

/**
 * Persist a user turn and the completed assistant response as CoachMessage rows.
 * Called from streamText's onFinish callback after the agent loop completes.
 */
export async function persistTurn({
  userId,
  userContent,
  assistantText,
  steps,
}: {
  userId: string;
  userContent: string;
  assistantText: string;
  steps: StepResult<any>[];
}) {
  // Collect tool calls across all steps for the assistant message's toolCalls JSON column
  const toolCalls = steps.flatMap((step) =>
    (step.toolCalls ?? []).map((tc) => ({
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      input: tc.input,
    }))
  );

  await prisma.$transaction([
    prisma.coachMessage.create({
      data: {
        userId,
        role: "user",
        content: userContent,
      },
    }),
    prisma.coachMessage.create({
      data: {
        userId,
        role: "assistant",
        content: assistantText,
        toolCalls:
          toolCalls.length > 0
            ? (toolCalls as unknown as Prisma.InputJsonValue)
            : undefined,
      },
    }),
  ]);
}

/**
 * Load the persisted chat history for the sliding window.
 * Returns the most recent N messages ordered oldest-first (for conversation context).
 */
export async function loadHistory(userId: string, limit = 20) {
  const rows = await prisma.coachMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      role: true,
      content: true,
      createdAt: true,
    },
  });
  // Reverse so oldest is first (conversation order)
  return rows.reverse();
}
