"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ConversationEventKind, ConversationSource } from "@/lib/types";

export interface ConversationEventCreateInput {
  userId: string;
  kind: ConversationEventKind;
  userText: string;
  systemText?: string | null;
  source: ConversationSource;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function createConversationEvent(input: ConversationEventCreateInput) {
  return prisma.conversationEvent.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      userText: input.userText,
      systemText: input.systemText ?? null,
      source: input.source,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function createConversationEvents(inputs: ConversationEventCreateInput[]) {
  if (!inputs.length) return;

  await prisma.conversationEvent.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      kind: input.kind,
      userText: input.userText,
      systemText: input.systemText ?? null,
      source: input.source,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      ...(input.metadata ? { metadata: input.metadata as Prisma.InputJsonValue } : {}),
    })),
  });
}
