const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Handle wrapped responses (success: true, data: {...})
  if (data.success && data.data) {
    return data.data as T;
  }

  return data as T;
}

// Upload audio file for transcription
export async function uploadAudio(
  audioUri: string,
  token: string | null
): Promise<{ transcript: string }> {
  const formData = new FormData();

  // Get file info from URI
  const filename = audioUri.split("/").pop() || "audio.m4a";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `audio/${match[1]}` : "audio/m4a";

  formData.append("audio", {
    uri: audioUri,
    name: filename,
    type,
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Transcription failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data || data;
}
