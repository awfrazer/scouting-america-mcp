# AGENTS.md

Guidance for AI coding agents (Cursor, Claude Code, Codex, etc.) working in this repo. Read this **before** making changes.

## What this project is

A TypeScript Model Context Protocol (MCP) server that exposes the unofficial Scouting America API (`api.scouting.org`) as 32 read-only tools. Authentication is JWT-based against `auth.scouting.org` using a single static username/password. Transport is Streamable HTTP via Express.

User-facing usage docs live in `[README.md](README.md)`.

## Required pre-merge checks

Before declaring any change done, run all three locally and make sure they pass:

```bash
npm run type-check
npm test
npm run build
```

CI is not configured, so these are the only safety net.

## Layout

```
src/
├── index.ts              # Shebang + dotenv + env warning + start
├── server.ts             # Express + sessionless StreamableHTTPServerTransport
├── session.ts            # JWT login + caching against auth.scouting.org
└── tools/
    ├── index.ts          # Barrel: imports each tool module for side effects
    ├── client.ts         # ScoutingClient: get/postJson/postFilter (throw) + rawRequest (no-throw)
    ├── responses.ts      # createToolResponse / createErrorResponse
    ├── toolRegistry.ts   # registerTool + attachHandlers(server)
    ├── account.ts        # whoami
    ├── catalog.ts        # 5 list_* catalog tools
    ├── requirements.ts   # 4 rank/adventure requirement tools
    ├── lookups.ts        # lookup (one tool, category enum)
    ├── person.ts         # 9 person tools
    ├── youth.ts          # 7 youth tools
    ├── events.ts         # 3 POST-as-filter tools
    ├── org.ts            # get_organization_profile
    └── passthrough.ts    # api_request (uses rawRequest)
test/
├── responses.test.ts
├── session.test.ts       # fetch is mocked; never hits the network
├── client.test.ts        # fetch is mocked
└── tool-registry.test.ts # snapshot of all 32 expected tool names
```

`dist/` is the build output. Never edit it by hand and never commit it.

## Auth flow (ground truth)

The login endpoint is `POST https://auth.scouting.org/api/users/<username>/authenticate` with:

- `Content-Type: application/json`
- `Accept: application/json; version=2`
- Body: `{"password":"<plaintext>"}`
- A browser-shaped `User-Agent`, plus `Origin: https://advancements.scouting.org` and matching `Referer` (some upstream layers have rejected requests without these).

The 200 response is JSON with at least `{ token, account: { userId, username }, personGuid, … }`. The `token` is a JWT (HS384, ~8h lifetime); the only claim we read is `exp`. We cache `{ token, username, userId, exp }` in module-level memory in `[src/session.ts](src/session.ts)` and refresh ~60s before `exp`.

There is no OAuth, no refresh token, and no per-request credential injection. If you find yourself wanting to add any of those, stop and ask the user — the single-user, env-configured model is intentional.

## Tool catalog

All 32 tools are pinned in `[test/tool-registry.test.ts](test/tool-registry.test.ts)`.

### `outputSchema` policy

Only **`whoami`** and **`api_request`** declare an `outputSchema` — those are the only tools where we construct the response shape ourselves. Every other tool is an upstream passthrough and MUST NOT declare an `outputSchema`. The allow-list lives in `TOOLS_WITH_OUTPUT_SCHEMA` in the registry test.

Why this matters (we tripped both of these in real Cursor sessions):

1. The MCP SDK's `Tool.outputSchema` zod schema rejects `{ type: "array" }` outright — Cursor drops the entire tool list with `Invalid input: expected "object"` if even one tool declares it. Bare-array endpoints therefore can't get a meaningful `outputSchema` at all.
2. The SDK's `CallToolResult.structuredContent` validator expects a `record` (object). A bare array there fails with `-32602 "expected record, received array"`.
3. If `outputSchema` is declared, the SDK requires `structuredContent` to be present in every successful response — so omitting it for arrays/primitives flips error #2 into `-32600 "Tool X has an output schema but did not return structured content"`.

Strict allow-listing sidesteps all three. `createToolResponse` in `[src/tools/responses.ts](src/tools/responses.ts)` only attaches `structuredContent` when the payload is a plain object, so arrays/strings/numbers/null/etc. ride safely in `content[0].text` as JSON.

## Conventions an agent must follow

### Tool naming

- Tool names are unprefixed lowercase snake_case (e.g. `whoami`, `get_person_profile`). MCP clients namespace by server (Cursor exposes them as `scouting-america.<name>`), so adding a `scouting_` prefix is redundant and burns through Cursor's 60-char `serverName.toolName` budget. The registry test enforces this with a `doesNotMatch(/^scouting[_-]/)` assertion.
- Tool names are pinned by `[test/tool-registry.test.ts](test/tool-registry.test.ts)` — the snapshot test will fail loudly if a name drifts.

### Adding a new tool

1. Decide which module it belongs in (or add a new one and import it in `[src/tools/index.ts](src/tools/index.ts)`).
2. Call `registerTool(name, definition, handler)`. The handler signature is `(args, client) => Promise<ToolResponse>`.
3. The definition MUST include:
   - `description` (one or two sentences).
   - `inputSchema` (JSON Schema, `additionalProperties: false`, `required: [...]` where applicable).
   - **No `outputSchema`** unless the tool constructs its own response shape (i.e. you're not just returning what came back from `api.scouting.org`). If you do declare one, it must be `{ type: "object" }` and you must add the tool name to `TOOLS_WITH_OUTPUT_SCHEMA` in the registry test. See "outputSchema policy" above for the three error classes this avoids.
   - `annotations: { readOnlyHint: true }`. Every tool in this MCP is read-only — even the POSTs are filter-by-body, not creation.
4. Use closed-set `enum` constraints when the upstream accepts a fixed set of values (see existing tools for examples).
5. Update `EXPECTED_TOOLS` in `[test/tool-registry.test.ts](test/tool-registry.test.ts)`.

### Calling the upstream API

- Use the `ScoutingClient` injected into the handler. Don't import `fetch` or hit `api.scouting.org` directly from tool code.
- `client.get` / `client.postJson` / `client.postFilter` throw `Error("Scouting API error (HTTP <status>): <body excerpt>")` on non-2xx. The registry's CallTool handler catches the throw and converts it to `createErrorResponse(...)`.
- `client.rawRequest` is the no-throw escape hatch used by `api_request`. It returns `{ status, headers, body }` and intentionally does NOT throw, so callers can inspect upstream errors. Don't use it for typed tools — they should throw on non-2xx so the user sees a real error.
- Pass query params as the third argument; the client drops `undefined` / `null` / `""` automatically.

### Defaults for `userId` and GUIDs

- Tools that take a numeric `userId` and where it's optional should default to the authenticated user via `getCurrentUserId()` from `[src/session.ts](src/session.ts)`. See `[src/tools/youth.ts](src/tools/youth.ts)` for the canonical pattern.
- UUIDs (`personGuid`, `organizationGuid`) are always required. Do NOT default `personGuid` from the JWT `pgu` claim — keep "no defaults for GUIDs" simple and predictable.

### Secrets handling

- The cached JWT and `SCOUT_PASSWORD` are secrets. Never log them. Never echo them in error responses.
- The client strips `Authorization` from headers returned by `rawRequest`; if you add a similar low-level path, do the same.
- The error format `HTTP <status>: <body excerpt>` truncates upstream bodies at 300 chars to limit accidental data leakage.
- HAR captures contain plaintext passwords, member IDs, dates of birth, personGuids, and emails. Never commit a HAR file to this repo. `*.har` is already in `[.gitignore](.gitignore)`.

### Module-level state

- `[src/session.ts](src/session.ts)` holds the cached session in module scope and de-dupes concurrent in-flight logins. If you change the cache shape, update the test in `[test/session.test.ts](test/session.test.ts)` and call `clearScoutingSession()` between cases.
- `[src/tools/toolRegistry.ts](src/tools/toolRegistry.ts)` holds the tool registry in module scope. Tool modules register on import. `attachHandlers(server)` rebinds the registry to each freshly-constructed `Server` instance — important because the HTTP transport is sessionless and creates a new `Server` per request.

### Style

- TypeScript strict mode is on. Avoid `any`; prefer `unknown` + narrowing or generics.
- Avoid comments that just restate what the code does. Only comment non-obvious intent / trade-offs.
- Use ES modules with `.js` extensions in import paths (NodeNext + `"type": "module"` requires this even in TypeScript).
- Match the existing 2-space indentation; don't reformat unrelated code.

## Tests

- Test runner is Node's built-in `node:test` via `tsx`. No vitest, jest, or mocha.
- Network calls are mocked by stubbing `globalThis.fetch`. Don't make real HTTP requests in tests.
- Reset module state in `beforeEach` (e.g. `clearScoutingSession()`, restore `process.env`, restore the original `fetch`). Tests must be runnable in any order.
- Add a new test file under `test/` for any non-trivial change to `src/session.ts`, `src/tools/client.ts`, `src/tools/responses.ts`, or `src/tools/toolRegistry.ts`.

## Manual smoke test

When you change anything in the request / transport / registry / auth path:

```bash
npm run build
npm start
# in another terminal
curl -s http://localhost:3032/health
curl -s -X POST http://localhost:3032/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# whoami exercises the auth flow end-to-end
curl -s -X POST http://localhost:3032/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"whoami","arguments":{}}}'
```

You should see 32 tools and a non-error `whoami` response with `userId`, `username`, `tokenExpiresAt`.

## Things to NOT do

- Don't add write/mutation tools (e.g. POST creates, PATCH, DELETE) without explicit user approval. The whole MCP is currently read-only and several clients rely on `readOnlyHint: true` to allow tool calls without confirmation.
- Don't switch from username/password + JWT to OAuth. The upstream doesn't expose OAuth; this is the only auth scheme that works.
- Don't add per-request credential injection (e.g. taking a token in headers). The single-user, env-configured model is intentional.
- Don't bypass the registry to register handlers directly on `Server`. Future tooling (e.g. dynamic enable/disable) assumes everything goes through `registerTool`.
- Don't commit `.env`, real credentials, real personGuids, or HAR captures.
- Don't pin dependency versions to specific patch releases unless you're fixing a known bad release. Caret ranges (`^x.y.z`) are fine.
