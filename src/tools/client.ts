import { getScoutingSession } from "../session.js";

const BASE = "https://api.scouting.org";

export type QueryValue = string | number | boolean | undefined | null;
export type QueryRecord = Record<string, QueryValue>;

export interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface ScoutingClient {
  get<T = unknown>(path: string, query?: QueryRecord): Promise<T>;
  postJson<T = unknown>(
    path: string,
    body: unknown,
    query?: QueryRecord,
  ): Promise<T>;
  postFilter<T = unknown>(
    path: string,
    body: unknown,
    query?: QueryRecord,
  ): Promise<T>;
  rawRequest(
    path: string,
    options?: {
      method?: "GET" | "POST";
      query?: QueryRecord;
      body?: unknown;
    },
  ): Promise<RawResponse>;
}

function buildUrl(path: string, query?: QueryRecord): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, BASE);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function bodyExcerpt(text: string, max = 300): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") return;
    result[key] = value;
  });
  return result;
}

export async function createScoutingClient(): Promise<ScoutingClient> {
  async function authHeaders(): Promise<Record<string, string>> {
    const session = await getScoutingSession();
    return {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/json",
    };
  }

  async function request(
    method: "GET" | "POST",
    path: string,
    options: { query?: QueryRecord; body?: unknown } = {},
  ): Promise<Response> {
    const headers = await authHeaders();
    const init: RequestInit = { method, headers };
    if (options.body !== undefined && method === "POST") {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
    return fetch(buildUrl(path, options.query), init);
  }

  async function throwingJson<T>(
    method: "GET" | "POST",
    path: string,
    options: { query?: QueryRecord; body?: unknown } = {},
  ): Promise<T> {
    const res = await request(method, path, options);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Scouting API error (HTTP ${res.status}): ${bodyExcerpt(text)}`,
      );
    }
    const parsed = await readBody(res);
    return parsed as T;
  }

  return {
    get<T = unknown>(path: string, query?: QueryRecord): Promise<T> {
      return throwingJson<T>("GET", path, { query });
    },
    postJson<T = unknown>(
      path: string,
      body: unknown,
      query?: QueryRecord,
    ): Promise<T> {
      return throwingJson<T>("POST", path, { query, body });
    },
    postFilter<T = unknown>(
      path: string,
      body: unknown,
      query?: QueryRecord,
    ): Promise<T> {
      return throwingJson<T>("POST", path, { query, body });
    },
    async rawRequest(
      path: string,
      options: {
        method?: "GET" | "POST";
        query?: QueryRecord;
        body?: unknown;
      } = {},
    ): Promise<RawResponse> {
      const method = options.method ?? "GET";
      const res = await request(method, path, {
        query: options.query,
        body: options.body,
      });
      const body = await readBody(res);
      return {
        status: res.status,
        headers: headersToObject(res.headers),
        body,
      };
    },
  };
}
