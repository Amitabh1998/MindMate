// client/src/lib/api.ts

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

/* -------------------- helpers -------------------- */

function buildHeaders(init?: RequestInit) {
  const h = new Headers(init?.headers as HeadersInit | undefined);
  if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
  const token = localStorage.getItem("mm_token");
  if (token) h.set("Authorization", `Bearer ${token}`);
  return h;
}

export async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: buildHeaders(init),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

/* -------------------- auth -------------------- */

export type AuthResponse = {
  token: string;
  user: { id: string; name: string; email: string };
};

function storeAuth(auth: AuthResponse) {
  try {
    localStorage.setItem("mm_token", auth.token);
    localStorage.setItem("mm_user", JSON.stringify(auth.user));
  } catch {}
  return auth;
}

export function registerUser(input: { name: string; email: string; password: string }) {
  // Sign-up does NOT auto-login
  return api("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<AuthResponse>;
}

export function loginUser(input: { email: string; password: string }) {
  // Login auto-stores token for smoother UX
  return api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  }).then(storeAuth) as Promise<AuthResponse>;
}

export function getMe() {
  return api("/api/auth/me", {
    method: "GET",
  }) as Promise<{ user: { name: string; email: string; createdAt?: string } }>;
}

/* -------------------- moods / metrics -------------------- */

export type MoodLabel = "Happy" | "Content" | "Neutral" | "Stressed" | "Sad";

export function saveMood(input: { label: MoodLabel; value: number; level: number }) {
  return api("/api/moods", {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<{ ok?: boolean }>;
}

/** Optional alt endpoint if you ever need raw series only */
export function getMoodSeries(days = 30) {
  return api(`/api/moods/series?days=${encodeURIComponent(days)}`, {
    method: "GET",
  }) as Promise<{ dates: string[]; values: Array<number | null> }>;
}

/** Metrics with 30-day series + stats (what DashboardPage.tsx expects). */
export function getMetrics(days = 30) {
  return api(`/api/moods/metrics?days=${encodeURIComponent(days)}`, {
    method: "GET",
  }) as Promise<{
    series: Array<{ date: string; value: number }>;
    stats: {
      average: number | null;
      last7Avg: number | null;
      latest: number | null;
      best: number | null;
      lowest: number | null;
    };
  }>;
}

/* -------------------- assistant (LLM) -------------------- */

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export function chatAssistant(messages: ChatMsg[]) {
  return api("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  }) as Promise<{ reply: string }>;
}

export function getChatHistory() {
  return api("/api/assistant/history", {
    method: "GET",
  }) as Promise<{ messages: ChatMsg[] }>;
}

/** Streaming (SSE) variant; calls onChunk for each token */
export async function chatAssistantStream(messages: ChatMsg[], onChunk: (text: string) => void) {
  const res = await fetch(`${API_URL}/api/assistant/chat/stream`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ messages }),
  });
  if (!res.ok || !res.body) throw new Error("Stream failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);

      if (!line.startsWith("data:")) continue;
      let data = line.slice(5);
      if (data.startsWith(" ")) data = data.slice(1); // keep leading token space intact
      if (!data || data === "[DONE]") continue;

      onChunk(data);
      full += data;
    }
  }
  return full;
}

/* -------------------- recommendations -------------------- */

export type RecItem = { title: string; blurb: string; to: string; img?: string };

export function getRecommendations(input: { label: MoodLabel; level: number }) {
  return api("/api/assistant/recommendations", {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<{ items: RecItem[] }>;
}

/* -------------------- goals -------------------- */

export type Goal = {
  _id: string;
  title: string;
  progress: number; // 0..100
  dueAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function listGoals() {
  return api("/api/goals", { method: "GET" }) as Promise<{ goals: Goal[] }>;
}

export function createGoal(input: { title: string; dueAt?: string | null }) {
  return api("/api/goals", {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<{ goal: Goal }>;
}

export function updateGoal(
  id: string,
  patch: Partial<{ title: string; progress: number; dueAt: string | null; completed: boolean }>
) {
  return api(`/api/goals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<{ goal: Goal }>;
}

export function deleteGoal(id: string) {
  return api(`/api/goals/${id}`, { method: "DELETE" }) as Promise<{ ok: true }>;
}
