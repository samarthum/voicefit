import { auth } from "@clerk/nextjs/server";
import { prisma } from "./db";
import { NextResponse } from "next/server";

/**
 * Get current authenticated user, creating if necessary
 */
export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  let user = await prisma.appUser.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    user = await prisma.appUser.create({
      data: { clerkUserId },
    });
  }

  return user;
}

/**
 * Standard error response
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

/**
 * Standard success response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    { success: true, data },
    { status }
  );
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse() {
  return errorResponse("Unauthorized", 401);
}

/**
 * Not found response
 */
export function notFoundResponse(resource: string = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}
