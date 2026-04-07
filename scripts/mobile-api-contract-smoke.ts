type JsonObject = Record<string, unknown>;

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const token = process.env.TOKEN ?? "";
const includeAssistant = process.env.INCLUDE_ASSISTANT === "1";
const hasToken = token.trim().length > 0;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(
  path: string,
  options: RequestInit = {},
  bearerToken?: string
): Promise<{ status: number; json: JsonObject }> {
  const headers = new Headers(options.headers);
  if (bearerToken) {
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const raw = await response.text();
  let json: JsonObject;
  try {
    json = JSON.parse(raw) as JsonObject;
  } catch {
    throw new Error(
      `Expected JSON response for ${path}, got status ${response.status}. Body starts with: ${raw.slice(0, 120)}`
    );
  }
  return { status: response.status, json };
}

function assertEnvelope(json: JsonObject, context: string) {
  assert(typeof json.success === "boolean", `${context}: missing boolean success`);
  if ((json.success as boolean) === false) {
    assert(typeof json.error === "string", `${context}: missing string error on failure`);
  }
}

async function checkUnauthEnvelope() {
  const { status, json } = await requestJson("/api/dashboard?timezone=UTC");
  assertEnvelope(json, "unauth dashboard");
  assert(status === 401, `unauth dashboard: expected 401, got ${status}`);
  assert(json.success === false, "unauth dashboard: expected success=false");
}

async function checkAuthedEnvelope() {
  const cleanupDate = "2099-12-31";

  const dashboard = await requestJson("/api/dashboard?timezone=UTC", {}, token);
  assertEnvelope(dashboard.json, "authed dashboard");
  assert(dashboard.status === 200, `authed dashboard: expected 200, got ${dashboard.status}`);
  assert(dashboard.json.success === true, "authed dashboard: expected success=true");

  const settings = await requestJson("/api/user/settings", {}, token);
  assertEnvelope(settings.json, "authed settings");
  assert(settings.status === 200, `authed settings: expected 200, got ${settings.status}`);
  assert(settings.json.success === true, "authed settings: expected success=true");

  const conversation = await requestJson("/api/conversation?limit=5", {}, token);
  assertEnvelope(conversation.json, "authed conversation");
  assert(
    conversation.status === 200,
    `authed conversation: expected 200, got ${conversation.status}`
  );
  assert(conversation.json.success === true, "authed conversation: expected success=true");

  const meals = await requestJson("/api/meals?limit=5", {}, token);
  assertEnvelope(meals.json, "authed meals");
  assert(meals.status === 200, `authed meals: expected 200, got ${meals.status}`);
  assert(meals.json.success === true, "authed meals: expected success=true");

  const sessions = await requestJson("/api/workout-sessions?limit=5", {}, token);
  assertEnvelope(sessions.json, "authed workout sessions");
  assert(
    sessions.status === 200,
    `authed workout sessions: expected 200, got ${sessions.status}`
  );
  assert(sessions.json.success === true, "authed workout sessions: expected success=true");

  const fitbitStatus = await requestJson("/api/fitbit/status", {}, token);
  assertEnvelope(fitbitStatus.json, "authed fitbit status");
  assert(
    fitbitStatus.status === 200,
    `authed fitbit status: expected 200, got ${fitbitStatus.status}`
  );
  assert(fitbitStatus.json.success === true, "authed fitbit status: expected success=true");

  const dailyCreate = await requestJson(
    "/api/daily-metrics",
    {
      method: "POST",
      body: JSON.stringify({
        date: cleanupDate,
        steps: 1234,
      }),
    },
    token
  );
  assertEnvelope(dailyCreate.json, "authed daily-metrics POST");
  assert(
    dailyCreate.status === 200,
    `authed daily-metrics POST: expected 200, got ${dailyCreate.status}`
  );
  assert(dailyCreate.json.success === true, "authed daily-metrics POST: expected success=true");

  const dailyGet = await requestJson(`/api/daily-metrics/${cleanupDate}`, {}, token);
  assertEnvelope(dailyGet.json, "authed daily-metrics GET");
  assert(dailyGet.status === 200, `authed daily-metrics GET: expected 200, got ${dailyGet.status}`);
  assert(dailyGet.json.success === true, "authed daily-metrics GET: expected success=true");

  const dailyDelete = await requestJson(
    `/api/daily-metrics/${cleanupDate}`,
    { method: "DELETE" },
    token
  );
  assertEnvelope(dailyDelete.json, "authed daily-metrics DELETE");
  assert(
    dailyDelete.status === 200,
    `authed daily-metrics DELETE: expected 200, got ${dailyDelete.status}`
  );
  assert(dailyDelete.json.success === true, "authed daily-metrics DELETE: expected success=true");

  if (includeAssistant) {
    const assistant = await requestJson(
      "/api/assistant/chat",
      {
        method: "POST",
        body: JSON.stringify({
          message: "Summarize my recent progress briefly",
          timezone: "UTC",
        }),
      },
      token
    );
    assertEnvelope(assistant.json, "authed assistant chat");
    assert(
      assistant.status === 200,
      `authed assistant chat: expected 200, got ${assistant.status}`
    );
    assert(assistant.json.success === true, "authed assistant chat: expected success=true");
  }
}

async function main() {
  console.log(`Running mobile API contract smoke checks against ${baseUrl}`);
  await checkUnauthEnvelope();
  console.log("PASS unauthenticated envelope checks");

  if (!hasToken) {
    console.log("SKIP authenticated checks (TOKEN not provided)");
    return;
  }

  await checkAuthedEnvelope();
  console.log("PASS authenticated envelope checks");
}

main().catch((error) => {
  console.error("FAIL mobile API contract smoke:", error);
  process.exitCode = 1;
});
