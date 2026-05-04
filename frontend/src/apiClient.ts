import { apiUrl } from "./apiUrl";

/** True when the production bundle was built without `VITE_API_URL` → requests wrongly use localhost. */
export function isProductionMissingApiUrl(): boolean {
  return (
    import.meta.env.PROD &&
    (typeof import.meta.env.VITE_API_URL !== "string" ||
      import.meta.env.VITE_API_URL.trim() === "")
  );
}

/**
 * Performs `fetch(apiUrl(...))` with clearer errors for misconfigured deployments and bad responses.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), init);
  } catch (e) {
    if (isProductionMissingApiUrl()) {
      throw new Error(
        "Frontend is not configured with your API URL. In Vercel: open your **frontend** project → Settings → Environment Variables → add VITE_API_URL = your backend URL (HTTPS, no trailing slash) → **Redeploy** so the bundle rebuilds.",
      );
    }
    const raw =
      e instanceof Error ? e.message : "Cannot reach API (network error)";
    const target = apiUrl("/");
    if (raw === "Failed to fetch" || raw.includes("fetch")) {
      throw new Error(
        `Cannot reach API (${target}). Typical causes: wrong VITE_API_URL (must be your backend URL exactly; redeploy frontend after changing it), API down/sleeping on first request (retry), or CORS/firewall/blocker. Confirm in DevTools → Network that the POST URL is HTTPS and hits your backend; open that URL / in another tab.`,
      );
    }
    throw new Error(raw);
  }
}

async function parseJsonSafe(
  res: Response,
): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `API returned non-JSON (HTTP ${res.status}). Check **VITE_API_URL** matches your deployed backend.`,
    );
  }
}

/** Fetch JSON; throws Error with `.message` from server when present */
export async function apiJson<T extends Record<string, unknown>>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const msg = data.message;
    throw new Error(
      typeof msg === "string" ? msg : `Request failed (${res.status})`,
    );
  }
  return data as T;
}
