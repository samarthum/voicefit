import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  successResponse,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/api-helpers";

const coachProfileSchema = z.object({
  goal: z.enum(["lose", "gain", "recomp", "maintain"]).nullable().optional(),
  heightCm: z.number().min(50).max(300).nullable().optional(),
  weightKg: z.number().min(20).max(400).nullable().optional(),
  age: z.number().int().min(10).max(120).nullable().optional(),
  biologicalSex: z.enum(["male", "female", "other"]).nullable().optional(),
  dietaryStyle: z
    .enum(["omnivore", "vegetarian", "vegan", "pescatarian", "other"])
    .nullable()
    .optional(),
  dietaryRestrictions: z.string().max(500).nullable().optional(),
  trainingExperience: z
    .enum(["beginner", "intermediate", "advanced"])
    .nullable()
    .optional(),
});

// GET /api/coach/profile — returns profile or null
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const profile = await prisma.coachProfile.findUnique({
      where: { userId: user.id },
    });

    return successResponse(profile);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("GET /api/coach/profile error:", error);
    return errorResponse("Failed to load profile", 500);
  }
}

// PUT /api/coach/profile — upsert
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const body = await request.json();
    const parsed = coachProfileSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message);
    }

    const profile = await prisma.coachProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...parsed.data,
      },
      update: parsed.data,
    });

    return successResponse(profile);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorizedResponse();
    }
    console.error("PUT /api/coach/profile error:", error);
    return errorResponse("Failed to update profile", 500);
  }
}
