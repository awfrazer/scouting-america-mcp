import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { clearScoutingSession } from "../src/session.js";
import { attachHandlers } from "../src/tools/toolRegistry.js";
// Importing the barrel registers every tool as an import side-effect; without
// it the registry attachHandlers reads from would be empty.
import "../src/tools/index.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = { ...process.env };

function makeJwt(exp: number): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `${header}.${body}.sig`;
}

const TEST_TOKEN = makeJwt(Math.floor(Date.now() / 1000) + 3600);

function installFetchMock(): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("auth.scouting.org")) {
      return new Response(
        JSON.stringify({ token: TEST_TOKEN, account: { userId: 42 } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ ranks: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

// Minimal fake Server that captures the handlers attachHandlers registers,
// keyed by the schema it was registered against. This avoids standing up the
// full MCP transport while still exercising the real request-handler bodies.
type Handler = (request: unknown) => Promise<unknown>;

function makeFakeServer(): {
  server: Server;
  call: (schema: unknown, request: unknown) => Promise<unknown>;
} {
  const handlers = new Map<unknown, Handler>();
  const server = {
    setRequestHandler(schema: unknown, handler: Handler) {
      handlers.set(schema, handler);
    },
  } as unknown as Server;
  return {
    server,
    call: (schema, request) => {
      const h = handlers.get(schema);
      if (!h) throw new Error("handler not registered for schema");
      return h(request);
    },
  };
}

beforeEach(() => {
  clearScoutingSession();
  process.env.SCOUT_USERNAME = "u@example.com";
  process.env.SCOUT_PASSWORD = "p";
  delete process.env.SCOUT_USER_ID;
  installFetchMock();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  clearScoutingSession();
});

describe("attachHandlers", () => {
  it("ListTools returns every registered tool with its schema", async () => {
    const { server, call } = makeFakeServer();
    attachHandlers(server);

    const result = (await call(ListToolsRequestSchema, {})) as {
      tools: Array<{ name: string; outputSchema?: unknown; annotations?: unknown }>;
    };

    assert.equal(result.tools.length, 60);
    const whoami = result.tools.find((t) => t.name === "whoami")!;
    // whoami is on the outputSchema allow-list and must expose it + annotations.
    assert.ok(whoami.outputSchema, "whoami should expose its outputSchema");
    assert.deepEqual(whoami.annotations, { readOnlyHint: true });
    // A passthrough tool must NOT carry an outputSchema.
    const listRanks = result.tools.find((t) => t.name === "list_ranks")!;
    assert.equal("outputSchema" in listRanks, false);
  });

  it("CallTool dispatches to the named tool's handler", async () => {
    const { server, call } = makeFakeServer();
    attachHandlers(server);

    const result = (await call(CallToolRequestSchema, {
      params: { name: "list_ranks", arguments: {} },
    })) as { isError: boolean };

    assert.equal(result.isError, false);
  });

  it("CallTool returns an error response for an unknown tool", async () => {
    const { server, call } = makeFakeServer();
    attachHandlers(server);

    const result = (await call(CallToolRequestSchema, {
      params: { name: "does_not_exist", arguments: {} },
    })) as { isError: boolean; content: Array<{ text: string }> };

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Unknown tool: does_not_exist/);
  });

  it("CallTool converts a handler throw into an error response", async () => {
    const { server, call } = makeFakeServer();
    attachHandlers(server);

    // lookup throws synchronously on an unsupported category; the CallTool
    // wrapper must catch it and return isError rather than rejecting.
    const result = (await call(CallToolRequestSchema, {
      params: { name: "lookup", arguments: { category: "bogus" } },
    })) as { isError: boolean; content: Array<{ text: string }> };

    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /Unsupported lookup category/);
  });

  it("CallTool tolerates missing arguments (defaults to {})", async () => {
    const { server, call } = makeFakeServer();
    attachHandlers(server);

    const result = (await call(CallToolRequestSchema, {
      params: { name: "list_ranks" },
    })) as { isError: boolean };

    assert.equal(result.isError, false);
  });
});
