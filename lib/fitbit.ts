import crypto from "crypto";

const FITBIT_AUTH_URL = "https://www.fitbit.com/oauth2/authorize";
const FITBIT_API_URL = "https://api.fitbit.com";

export type FitbitTokenResponse = {
  access_token: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
  user_id: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

function getFitbitConfig() {
  return {
    clientId: requireEnv("FITBIT_CLIENT_ID"),
    clientSecret: requireEnv("FITBIT_CLIENT_SECRET"),
    redirectUri: requireEnv("FITBIT_REDIRECT_URI"),
  };
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function generateOAuthState() {
  return base64UrlEncode(crypto.randomBytes(16));
}

export function generatePkcePair() {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  return { codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(options: {
  state: string;
  codeChallenge: string;
  scope?: string;
}) {
  const { clientId, redirectUri } = getFitbitConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: options.scope ?? "activity",
    state: options.state,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
  });

  return `${FITBIT_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = getFitbitConfig();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch(`${FITBIT_API_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Fitbit token exchange failed: ${message}`);
  }

  return (await response.json()) as FitbitTokenResponse;
}

export async function refreshAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getFitbitConfig();
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${FITBIT_API_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Fitbit token refresh failed: ${message}`);
  }

  return (await response.json()) as FitbitTokenResponse;
}

export async function revokeToken(token: string) {
  const { clientId, clientSecret } = getFitbitConfig();
  const params = new URLSearchParams({ token });

  const response = await fetch(`${FITBIT_API_URL}/oauth2/revoke`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${clientId}:${clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Fitbit revoke failed: ${message}`);
  }
}

export async function fetchDailyActivitySummary(
  accessToken: string,
  date: string
) {
  const response = await fetch(
    `${FITBIT_API_URL}/1/user/-/activities/date/${date}.json`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Fitbit activity fetch failed: ${message}`);
  }

  const data = await response.json();
  const steps = data?.summary?.steps;

  return {
    steps: typeof steps === "number" ? steps : null,
  };
}
