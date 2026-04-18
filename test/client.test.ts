import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { clearScoutingSession } from "../src/session.js";
import { createScoutingClient } from "../src/tools/client.js";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = { ...process.env };

function makeJwt(exp: number): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${body}.sig`;
}

const FAR_EXP = Math.floor(Date.now() / 1000) + 3600;
const TEST_TOKEN = makeJwt(FAR_EXP);

interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

function installFetchMock(
  routes: Array<{
    match: RegExp;
    respond: () => Response | Promise<Response>;
  }>,
): RecordedCall[] {
  const calls: RecordedCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = typeof init?.body === "string" ? init.body : undefined;
    calls.push({ url, method, headers, body });

    if (url.includes("auth.scouting.org")) {
      return new Response(
        JSON.stringify({ token: TEST_TOKEN, account: { userId: 42 } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    for (const route of routes) {
      if (route.match.test(url)) return route.respond();
    }
    return new Response("no route matched", { status: 599 });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  clearScoutingSession();
  process.env.SCOUT_USERNAME = "u@example.com";
  process.env.SCOUT_PASSWORD = "p";
  delete process.env.SCOUT_USER_ID;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  clearScoutingSession();
});

describe("ScoutingClient.get", () => {
  it("attaches the bearer token and parses JSON", async () => {
    const calls = installFetchMock([
      {
        match: /api\.scouting\.org\/advancements\/ranks/,
        respond: () =>
          new Response(JSON.stringify({ ranks: [{ id: 1 }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      },
    ]);

    const client = await createScoutingClient();
    const data = await client.get<{ ranks: Array<{ id: number }> }>(
      "/advancements/ranks",
    );

    assert.deepEqual(data, { ranks: [{ id: 1 }] });
    const apiCall = calls.find((c) => c.url.includes("api.scouting.org"))!;
    assert.equal(apiCall.headers["Authorization"], `Bearer ${TEST_TOKEN}`);
    assert.equal(apiCall.headers["Accept"], "application/json");
  });

  it("drops undefined / null / empty-string query values", async () => {
    const calls = installFetchMock([
      {
        match: /api\.scouting\.org/,
        respond: () =>
          new Response("[]", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      },
    ]);

    const client = await createScoutingClient();
    await client.get("/x", {
      keep: "yes",
      drop1: undefined,
      drop2: null,
      drop3: "",
      n: 7,
      flag: true,
    });

    const apiCall = calls.find((c) => c.url.includes("api.scouting.org"))!;
    const url = new URL(apiCall.url);
    assert.equal(url.searchParams.get("keep"), "yes");
    assert.equal(url.searchParams.get("n"), "7");
    assert.equal(url.searchParams.get("flag"), "true");
    assert.equal(url.searchParams.has("drop1"), false);
    assert.equal(url.searchParams.has("drop2"), false);
    assert.equal(url.searchParams.has("drop3"), false);
  });

  it("throws on non-2xx with the status and a body excerpt (and never includes the bearer)", async () => {
    installFetchMock([
      {
        match: /api\.scouting\.org/,
        respond: () =>
          new Response("upstream went boom", { status: 500 }),
      },
    ]);
    const client = await createScoutingClient();
    await assert.rejects(client.get("/anything"), (err: Error) => {
      assert.match(err.message, /HTTP 500/);
      assert.match(err.message, /upstream went boom/);
      assert.equal(
        err.message.includes(TEST_TOKEN),
        false,
        "error must never leak the bearer token",
      );
      return true;
    });
  });
});

describe("ScoutingClient.postJson / postFilter", () => {
  it("sends a JSON body with the right Content-Type", async () => {
    const calls = installFetchMock([
      {
        match: /api\.scouting\.org\/advancements\/events/,
        respond: () =>
          new Response("[]", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      },
    ]);

    const client = await createScoutingClient();
    await client.postFilter(
      "/advancements/events",
      { unitId: 1, fromDate: "2024-01-01", toDate: "2024-12-31" },
      { swCache: true },
    );

    const apiCall = calls.find((c) => c.url.includes("api.scouting.org"))!;
    assert.equal(apiCall.method, "POST");
    assert.equal(apiCall.headers["Content-Type"], "application/json");
    assert.equal(new URL(apiCall.url).searchParams.get("swCache"), "true");
    assert.deepEqual(JSON.parse(apiCall.body!), {
      unitId: 1,
      fromDate: "2024-01-01",
      toDate: "2024-12-31",
    });
  });
});

describe("ScoutingClient.rawRequest", () => {
  it("returns status/headers/body without throwing on non-2xx", async () => {
    installFetchMock([
      {
        match: /api\.scouting\.org/,
        respond: () =>
          new Response(JSON.stringify({ error: "nope" }), {
            status: 404,
            headers: {
              "content-type": "application/json",
              "x-debug": "alpha",
            },
          }),
      },
    ]);

    const client = await createScoutingClient();
    const result = await client.rawRequest("/missing");

    assert.equal(result.status, 404);
    assert.deepEqual(result.body, { error: "nope" });
    assert.equal(result.headers["x-debug"], "alpha");
  });

  it("strips Authorization from the returned headers", async () => {
    installFetchMock([
      {
        match: /api\.scouting\.org/,
        respond: () => {
          const h = new Headers({
            "content-type": "application/json",
          });
          h.set("authorization", "Bearer leak-me");
          return new Response("{}", { status: 200, headers: h });
        },
      },
    ]);

    const client = await createScoutingClient();
    const result = await client.rawRequest("/x");
    const lowered = Object.fromEntries(
      Object.entries(result.headers).map(([k, v]) => [k.toLowerCase(), v]),
    );
    assert.equal(lowered["authorization"], undefined);
  });

  it("supports POST with a JSON body", async () => {
    const calls = installFetchMock([
      {
        match: /api\.scouting\.org/,
        respond: () =>
          new Response("{}", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      },
    ]);

    const client = await createScoutingClient();
    await client.rawRequest("/foo", {
      method: "POST",
      body: { a: 1 },
      query: { z: "yes" },
    });

    const apiCall = calls.find((c) => c.url.includes("api.scouting.org"))!;
    assert.equal(apiCall.method, "POST");
    assert.equal(JSON.parse(apiCall.body!).a, 1);
    assert.equal(new URL(apiCall.url).searchParams.get("z"), "yes");
  });
});
