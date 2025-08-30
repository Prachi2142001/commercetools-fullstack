// Lightweight Commercetools client using fetch + client-credentials flow.
// Node 18+ recommended (global fetch). If on Node <18, install a fetch polyfill.
let cachedToken: { access_token: string; expires_at: number } | null = null;

const {
  CT_CLIENT_ID,
  CT_CLIENT_SECRET,
  CT_AUTH_URL,
  CT_API_URL,
  CT_PROJECT_KEY,
  CT_SCOPES, // e.g. "view_products:{projectKey}"
} = process.env as Record<string, string>;

if (!CT_CLIENT_ID || !CT_CLIENT_SECRET || !CT_AUTH_URL || !CT_API_URL || !CT_PROJECT_KEY) {
  throw new Error(
    "Missing required env vars. Need CT_CLIENT_ID, CT_CLIENT_SECRET, CT_AUTH_URL, CT_API_URL, CT_PROJECT_KEY"
  );
}

function trimSlash(s: string) {
  return s.replace(/\/+$/, "");
}

function authUrl(): string {
  // client credentials token endpoint
  return `${trimSlash(CT_AUTH_URL)}/oauth/token`;
}

function projectApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${trimSlash(CT_API_URL)}/${CT_PROJECT_KEY}${p}`;
}

function buildUrl(path: string, query?: Record<string, any>): string {
  const url = new URL(projectApiUrl(path));
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 5000) {
    return cachedToken.access_token;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  if (CT_SCOPES) body.set("scope", CT_SCOPES);

  const res = await fetch(authUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${CT_CLIENT_ID}:${CT_CLIENT_SECRET}`).toString("base64"),
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    // cache conservatively
    expires_at: now + (data.expires_in ?? 300) * 1000,
  };
  return cachedToken.access_token;
}

/**
 * GET JSON with optional query params
 */
export async function ctJsonGet<T = any>(path: string, query?: Record<string, any>): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path, query), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * GET JSON (404 -> null) with optional query params
 */
export async function ctJsonGetOrNull<T = any>(
  path: string,
  query?: Record<string, any>
): Promise<T | null> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path, query), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

/**
 * POST JSON with optional query params
 */
export async function ctJsonPost<T = any>(
  path: string,
  body: unknown,
  query?: Record<string, any>
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(buildUrl(path, query), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}
