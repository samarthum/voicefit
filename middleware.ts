import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
]);

const isDev = process.env.NODE_ENV !== "production";
const DEV_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/;

function applyDevCors(response: NextResponse, origin: string | null) {
  if (!isDev || !origin || !DEV_ORIGIN_PATTERN.test(origin)) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With",
  );
  response.headers.set("Vary", "Origin");
  return response;
}

export default clerkMiddleware(async (auth, request) => {
  const origin = request.headers.get("origin");

  if (request.nextUrl.pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      return applyDevCors(new NextResponse(null, { status: 204 }), origin);
    }
    return applyDevCors(NextResponse.next(), origin);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
