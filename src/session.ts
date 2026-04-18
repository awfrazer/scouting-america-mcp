interface CachedSession {
  token: string;
  username: string;
  userId: string;
  /**
   * The authenticated user's personGuid (UUID), as returned by the auth
   * service's `personGuid` field. Captured for visibility via `whoami` only —
   * tools that take a `personGuid` argument intentionally do NOT default to
   * this value (see AGENTS.md "Defaults for `userId` and GUIDs"). May be the
   * empty string if the auth response omits it.
   */
  personGuid: string;
  exp: number;
}

let cached: CachedSession | null = null;
let inflight: Promise<CachedSession> | null = null;

const LOGIN_URL = (username: string): string =>
  `https://auth.scouting.org/api/users/${encodeURIComponent(username)}/authenticate`;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

function decodeJwtExp(token: string): number {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("JWT is malformed (expected at least 2 segments)");
  }
  const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
  const payload = JSON.parse(payloadJson) as { exp?: unknown };
  if (typeof payload.exp !== "number") {
    throw new Error("JWT is missing a numeric `exp` claim");
  }
  return payload.exp;
}

async function login(): Promise<CachedSession> {
  const username = process.env.SCOUT_USERNAME;
  const password = process.env.SCOUT_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "SCOUT_USERNAME and SCOUT_PASSWORD must be set (see env.example)",
    );
  }

  const res = await fetch(LOGIN_URL(username), {
    method: "POST",
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      Origin: "https://advancements.scouting.org",
      Referer: "https://advancements.scouting.org/",
      "Content-Type": "application/json",
      Accept: "application/json; version=2",
    },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Scouting login failed: HTTP ${res.status} ${body.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as {
    token?: string;
    account?: { userId?: number | string };
    personGuid?: string;
  };
  if (!json.token) {
    throw new Error("Scouting login response is missing `token`");
  }

  const userIdOverride = process.env.SCOUT_USER_ID;
  const session: CachedSession = {
    token: json.token,
    username,
    userId: userIdOverride || String(json.account?.userId ?? ""),
    personGuid: json.personGuid ?? "",
    exp: decodeJwtExp(json.token),
  };
  return session;
}

export async function getScoutingSession(): Promise<CachedSession> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) {
    return cached;
  }
  if (inflight) {
    return inflight;
  }
  inflight = login()
    .then((session) => {
      cached = session;
      return session;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function getCurrentUserId(): Promise<string> {
  const session = await getScoutingSession();
  if (!session.userId) {
    throw new Error(
      "No userId available from login response; set SCOUT_USER_ID to override",
    );
  }
  return session.userId;
}

export function clearScoutingSession(): void {
  cached = null;
}
