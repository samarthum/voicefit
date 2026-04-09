import { NextRequest } from "next/server";
import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/api-helpers";
import { coachTools } from "@/lib/coach/tools";
import { buildSystemPrompt } from "@/lib/coach/system-prompt";
import { persistTurn } from "@/lib/coach/persistence";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);

  const body = (await request.json()) as {
    messages: UIMessage[];
    timezone?: string;
  };
  const { messages, timezone } = body;

  if (!messages || messages.length === 0) {
    return new Response("messages is required", { status: 400 });
  }

  // Load profile, facts, and goals in parallel
  const [profile, facts] = await Promise.all([
    prisma.coachProfile.findUnique({ where: { userId: user.id } }),
    prisma.userFact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Extract the last user message text for persistence
  const lastUserMsg = messages[messages.length - 1];
  const userContent =
    lastUserMsg?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n") ?? "";

  // Sliding window: take last 20 messages from what the client sent
  const windowed = messages.slice(-20);

  const system = buildSystemPrompt({
    profile,
    facts,
    timezone,
    today: new Date(),
    calorieGoal: user.calorieGoal,
    stepGoal: user.stepGoal,
  });

  const result = streamText({
    model: "anthropic/claude-sonnet-4.6",
    system,
    messages: await convertToModelMessages(windowed),
    tools: coachTools(user.id),
    stopWhen: stepCountIs(8),
    providerOptions: {
      anthropic: {
        thinking: { type: "enabled" as const, budgetTokens: 12000 },
      },
    },
    prepareStep: async ({ stepNumber }) => {
      // Force a final-text answer if we've reached the cap
      if (stepNumber >= 7) return { activeTools: [] };
      return {};
    },
    onFinish: async ({ text, steps }) => {
      try {
        await persistTurn({
          userId: user.id,
          userContent,
          assistantText: text,
          steps,
        });
      } catch (err) {
        console.error("Failed to persist coach turn:", err);
      }
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "none",
    },
  });
}
