import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api-helpers";
import {
  buildAuthorizeUrl,
  generateOAuthState,
  generatePkcePair,
} from "@/lib/fitbit";

const STATE_COOKIE = "fitbit_oauth_state";
const VERIFIER_COOKIE = "fitbit_code_verifier";
const COOKIE_MAX_AGE_SECONDS = 10 * 60;

export async function GET() {
  await getCurrentUser();

  const { codeVerifier, codeChallenge } = generatePkcePair();
  const state = generateOAuthState();
  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === "production";

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  cookieStore.set(VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  const authorizeUrl = buildAuthorizeUrl({
    state,
    codeChallenge,
  });

  return NextResponse.redirect(authorizeUrl);
}
