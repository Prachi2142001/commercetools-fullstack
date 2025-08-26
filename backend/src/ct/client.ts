let cachedToken: { access_token: string; expires_at: number } | null = null;

const {
  CT_CLIENT_ID,
  CT_CLIENT_SECRET,
  CT_AUTH_URL,
  CT_API_URL,
  CT_PROJECT_KEY,
  CT_SCOPES,
} = process.env as Record<string, string>;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expires_at > now + 5000) {
    return cachedToken.access_token;
  }

  const res = await fetch(`${CT_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(`${CT_CLIENT_ID}:${CT_CLIENT_SECRET}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: CT_SCOPES,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + data.expires_in * 1000,
  };
  return cachedToken.access_token;
}

export async function ctGet(path: string) {
  const token = await getToken();
  const url = `${CT_API_URL}/${CT_PROJECT_KEY}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CT GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}
