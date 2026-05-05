import { after, NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  errorResponse,
  getCurrentUser,
  successResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { createConversationEvent } from "@/lib/conversation-events";
import { interpretMeal, type MealInterpretationImage } from "@/lib/interpretation";
import {
  interpretMealLogRequestSchema,
  mealTypeSchema,
} from "@/lib/validations";

export const maxDuration = 60;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface InterpretMealJobInput {
  mealId: string;
  userId: string;
  transcript: string;
  mealType?: string;
  eatenAt: string;
  image?: MealInterpretationImage;
}

async function runMealInterpretationJob({
  mealId,
  userId,
  transcript,
  mealType,
  eatenAt,
  image,
}: InterpretMealJobInput) {
  try {
    const interpretation = await interpretMeal({
      userId,
      transcript,
      mealType,
      eatenAt,
      image,
    });

    const meal = await prisma.$transaction(async (tx) => {
      await tx.mealIngredient.deleteMany({
        where: { mealLogId: mealId },
      });

      return tx.mealLog.update({
        where: { id: mealId },
        data: {
          eatenAt: new Date(eatenAt),
          mealType: interpretation.mealType,
          description: interpretation.description,
          interpretationStatus: "needs_review",
          calories: interpretation.calories,
          proteinG: interpretation.proteinG,
          carbsG: interpretation.carbsG,
          fatG: interpretation.fatG,
          ingredients: {
            create: interpretation.ingredients.map((ingredient, index) => ({
              position: index,
              name: ingredient.name,
              grams: ingredient.grams,
              calories: ingredient.calories,
              proteinG: ingredient.proteinG,
              carbsG: ingredient.carbsG,
              fatG: ingredient.fatG,
            })),
          },
        },
      });
    });

    try {
      await createConversationEvent({
        userId,
        kind: "meal",
        userText: transcript,
        systemText: `Interpreted ${interpretation.description} · ${interpretation.calories} kcal`,
        source: image ? "system" : "text",
        referenceType: "meal",
        referenceId: meal.id,
        metadata: {
          mealType: interpretation.mealType,
          description: interpretation.description,
          calories: interpretation.calories,
          eatenAt: meal.eatenAt.toISOString(),
          interpretationStatus: "needs_review",
          hasImage: Boolean(image),
        },
      });
    } catch (error) {
      console.error("Conversation event error (meal interpretation):", error);
    }
  } catch (error) {
    console.error("Async meal interpretation failed:", error);
    try {
      await prisma.mealLog.update({
        where: { id: mealId },
        data: {
          interpretationStatus: "failed",
          calories: null,
          proteinG: null,
          carbsG: null,
          fatG: null,
        },
      });
    } catch (updateError) {
      console.error("Failed to mark meal interpretation failed:", updateError);
    }
  }
}

async function readImage(file: File): Promise<MealInterpretationImage> {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Image must be JPEG, PNG, GIF, or WebP");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5MB or smaller");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    mediaType: file.type as MealInterpretationImage["mediaType"],
    base64: buffer.toString("base64"),
  };
}

async function parseMultipart(request: NextRequest) {
  const form = await request.formData();
  const imageFile = form.get("image") ?? form.get("photo");
  const textValue = form.get("text") ?? form.get("transcript");
  const mealTypeValue = form.get("mealType");
  const eatenAtValue = form.get("eatenAt");

  const text = typeof textValue === "string" ? textValue.trim() : "";
  const mealType =
    typeof mealTypeValue === "string" && mealTypeValue
      ? mealTypeSchema.parse(mealTypeValue)
      : undefined;
  const eatenAt =
    typeof eatenAtValue === "string" && eatenAtValue
      ? zodDateTime(eatenAtValue)
      : new Date().toISOString();

  if (!(imageFile instanceof File) && !text) {
    throw new Error("Text or image is required");
  }

  return {
    transcript: text || "Interpret the meal in the attached image.",
    mealType,
    eatenAt,
    image: imageFile instanceof File ? await readImage(imageFile) : undefined,
  };
}

function zodDateTime(value: string) {
  const parsed = z.string().datetime().safeParse(value);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
  return value;
}

async function parseJson(request: NextRequest) {
  const body = await request.json();
  const parsed = interpretMealLogRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }
  return {
    transcript: (parsed.data.text ?? parsed.data.transcript ?? "").trim(),
    mealType: parsed.data.mealType,
    eatenAt: parsed.data.eatenAt ?? new Date().toISOString(),
    image: undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const contentType = request.headers.get("content-type") ?? "";
    const payload = contentType.includes("multipart/form-data")
      ? await parseMultipart(request)
      : await parseJson(request);

    const meal = await prisma.mealLog.create({
      data: {
        userId: user.id,
        eatenAt: new Date(payload.eatenAt),
        mealType: payload.mealType ?? "snack",
        description:
          payload.transcript === "Interpret the meal in the attached image."
            ? "Meal photo"
            : payload.transcript,
        transcriptRaw:
          payload.transcript === "Interpret the meal in the attached image."
            ? null
            : payload.transcript,
        interpretationStatus: "interpreting",
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
      },
      include: {
        ingredients: {
          orderBy: { position: "asc" },
        },
      },
    });

    after(async () => {
      await runMealInterpretationJob({
        mealId: meal.id,
        userId: user.id,
        transcript: payload.transcript,
        mealType: payload.mealType,
        eatenAt: payload.eatenAt,
        image: payload.image,
      });
    });

    return successResponse(meal, 202);
  } catch (error) {
    console.error("Start meal interpretation error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    const message = error instanceof Error ? error.message : "Failed to start meal interpretation";
    return errorResponse(message, 400);
  }
}
