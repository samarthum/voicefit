import { auth } from "@clerk/nextjs/server";
import { verifyToken } from "@clerk/backend";
import { prisma } from "./db";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const getAuthorizationHeader = async (request?: NextRequest) => {
  if (request) {
    return request.headers.get("authorization");
  }
  try {
    const headerList = await headers();
    return headerList.get("authorization");
  } catch {
    return null;
  }
};

const getBearerToken = async (request?: NextRequest) => {
  const header = await getAuthorizationHeader(request);
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
};

const getClerkUserIdFromBearer = async (request?: NextRequest) => {
  const token = await getBearerToken(request);
  if (!token) return null;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set");
  }
  try {
    const payload = await verifyToken(token, { secretKey });
    return payload?.sub ?? null;
  } catch (error) {
    console.warn("Bearer token verification failed:", error);
    return null;
  }
};

/**
 * Get current authenticated user, creating if necessary
 */
export async function getCurrentUser(request?: NextRequest) {
  let clerkUserId = await getClerkUserIdFromBearer(request);
  if (!clerkUserId) {
    const { userId } = await auth();
    clerkUserId = userId ?? null;
  }

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
