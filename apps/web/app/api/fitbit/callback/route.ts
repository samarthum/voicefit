import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/api-helpers";
import { exchangeCodeForToken } from "@/lib/fitbit";

const STATE_COOKIE = "fitbit_oauth_state";
const VERIFIER_COOKIE = "fitbit_code_verifier";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    return NextResponse.redirect(new URL("/settings?fitbit=error", request.url));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value;

  if (!code || !state || !storedState || !codeVerifier || storedState !== state) {
    return NextResponse.redirect(new URL("/settings?fitbit=invalid", request.url));
  }

  try {
    const user = await getCurrentUser();
    const token = await exchangeCodeForToken(code, codeVerifier);
    const scopes = token.scope?.split(" ") ?? [];

    if (!scopes.includes("activity")) {
      return NextResponse.redirect(
        new URL("/settings?fitbit=missing-scope", request.url)
      );
    }

    const expiresAt = new Date(Date.now() + token.expires_in * 1000);

    await prisma.fitbitConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fitbitUserId: token.user_id,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        scope: token.scope,
        expiresAt,
      },
      update: {
        fitbitUserId: token.user_id,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        scope: token.scope,
        expiresAt,
      },
    });

    cookieStore.delete(STATE_COOKIE);
    cookieStore.delete(VERIFIER_COOKIE);

    return NextResponse.redirect(
      new URL("/settings?fitbit=connected", request.url)
    );
  } catch (error) {
    console.error("Fitbit callback error:", error);
    return NextResponse.redirect(new URL("/settings?fitbit=error", request.url));
  }
}
