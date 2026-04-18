import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  clearScoutingSession,
  getCurrentUserId,
  getScoutingSession,
} from "../src/session.js";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = { ...process.env };

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature-not-checked`;
}

interface MockCall {
  url: string;
  init: RequestInit | undefined;
}

function installMockFetch(
  responder: (call: MockCall) => Response | Promise<Response>,
): MockCall[] {
  const calls: MockCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const call = { url, init };
    calls.push(call);
    return responder(call);
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  clearScoutingSession();
  process.env.SCOUT_USERNAME = "test-user@example.com";
  process.env.SCOUT_PASSWORD = "hunter2";
  delete process.env.SCOUT_USER_ID;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  clearScoutingSession();
});

describe("getScoutingSession", () => {
  it("throws when SCOUT_USERNAME or SCOUT_PASSWORD is missing", async () => {
    delete process.env.SCOUT_USERNAME;
    await assert.rejects(getScoutingSession(), /SCOUT_USERNAME/);
  });

  it("posts JSON credentials to auth.scouting.org and caches the JWT", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ exp });
    const calls = installMockFetch(
      () =>
        new Response(
          JSON.stringify({ token, account: { userId: 14498415 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const session = await getScoutingSession();

    assert.equal(session.token, token);
    assert.equal(session.username, "test-user@example.com");
    assert.equal(session.userId, "14498415");
    assert.equal(session.exp, exp);

    assert.equal(calls.length, 1);
    assert.match(
      calls[0].url,
      /^https:\/\/auth\.scouting\.org\/api\/users\/test-user%40example\.com\/authenticate$/,
    );
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers["Accept"], "application/json; version=2");
    assert.equal(headers["Origin"], "https://advancements.scouting.org");
    const body = calls[0].init?.body as string;
    assert.deepEqual(JSON.parse(body), { password: "hunter2" });
  });

  it("re-uses the cached session on subsequent calls (no second fetch)", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const calls = installMockFetch(
      () =>
        new Response(
          JSON.stringify({ token: makeJwt({ exp }), account: { userId: 1 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    const a = await getScoutingSession();
    const b = await getScoutingSession();

    assert.equal(calls.length, 1, "second call should hit the cache");
    assert.equal(a, b);
  });

  it("re-authenticates when the cached token is within 60s of expiring", async () => {
    const nowExp = Math.floor(Date.now() / 1000) + 30;
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    let n = 0;
    const calls = installMockFetch(() => {
      n++;
      const exp = n === 1 ? nowExp : futureExp;
      return new Response(
        JSON.stringify({ token: makeJwt({ exp }), account: { userId: 1 } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const first = await getScoutingSession();
    assert.equal(first.exp, nowExp);
    const second = await getScoutingSession();
    assert.equal(second.exp, futureExp);
    assert.equal(calls.length, 2);
  });

  it("dedupes concurrent in-flight logins", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    let resolveFetch: ((res: Response) => void) | undefined;
    const calls = installMockFetch(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const p1 = getScoutingSession();
    const p2 = getScoutingSession();

    assert.ok(resolveFetch);
    resolveFetch!(
      new Response(
        JSON.stringify({ token: makeJwt({ exp }), account: { userId: 7 } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const [a, b] = await Promise.all([p1, p2]);
    assert.equal(a, b);
    assert.equal(calls.length, 1);
  });

  it("surfaces upstream non-2xx as an Error", async () => {
    installMockFetch(() => new Response("blocked", { status: 503 }));
    await assert.rejects(getScoutingSession(), /HTTP 503/);
  });

  it("rejects when the response body is missing the token", async () => {
    installMockFetch(
      () =>
        new Response(JSON.stringify({ account: { userId: 1 } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    await assert.rejects(getScoutingSession(), /missing `token`/);
  });

  it("rejects when the JWT lacks an exp claim", async () => {
    const token = makeJwt({ uid: 1 });
    installMockFetch(
      () =>
        new Response(
          JSON.stringify({ token, account: { userId: 1 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    await assert.rejects(getScoutingSession(), /exp/);
  });

  it("honours SCOUT_USER_ID override", async () => {
    process.env.SCOUT_USER_ID = "99999999";
    const exp = Math.floor(Date.now() / 1000) + 3600;
    installMockFetch(
      () =>
        new Response(
          JSON.stringify({ token: makeJwt({ exp }), account: { userId: 1 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const session = await getScoutingSession();
    assert.equal(session.userId, "99999999");
  });
});

describe("getCurrentUserId", () => {
  it("returns the cached session's userId", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    installMockFetch(
      () =>
        new Response(
          JSON.stringify({ token: makeJwt({ exp }), account: { userId: 555 } }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    assert.equal(await getCurrentUserId(), "555");
  });
});
