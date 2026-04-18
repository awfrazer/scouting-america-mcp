# scouting-america-mcp

[![Run Tests](https://github.com/awfrazer/scouting-api-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/awfrazer/scouting-api-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the unofficial Scouting America API (`api.scouting.org`) as a set of read-only tools usable from Claude Desktop, Cursor, the MCP Inspector, or any other MCP-compatible client.

This is a **third-party, unofficial integration**. Scouting America does not publish or support a public API. Use at your own risk; you must agree to Scouting America's terms of service when using your own credentials.

## What's exposed

32 tools, all read-only:

- **Catalog (5)** — `list_ranks`, `list_adventures`, `list_awards`, `list_merit_badges`, `list_ss_electives`.
- **Requirements (4)** — `get_rank` / `get_rank_requirements`, `get_adventure` / `get_adventure_requirements`. Requirements are versioned; the parent record's `versions[]` array tells you which `versionId` to ask for.
- **Lookups (1)** — `lookup`, with a `category` enum covering 18 reference lists (countries, states, positions, schools, etc.).
- **Person (9)** — `get_person_profile`, `get_person_relationships`, `get_person_role_types`, `get_person_subscriptions`, `get_person_renewal_relationships`, `get_person_ypt_training`, `get_parent_guardian_invitation`, `list_membership_registrations`, `get_my_scout`.
- **Youth advancement (7)** — `get_youth_leadership_history`, `get_youth_ranks`, `get_youth_adventures`, `get_youth_awards`, `get_youth_advancement_requirements`, `get_user_activity_summary`, `get_payment_logs`. `userId` defaults to the authenticated user when omitted.
- **Events / activities (3)** — `list_unit_events`, `list_activities`, `list_advancement_comments`. These are POST-as-filter (the body is a search filter, not a creation payload).
- **Org (1)** — `get_organization_profile`.
- **Meta (2)** — `whoami` (returns the cached session, no upstream call) and `api_request` (generic passthrough — `{ path, method, query?, body? }` → `{ status, headers, body }`, does not throw on non-2xx).

Run `tools/list` against the server for the full schema of each tool (descriptions, input/output schemas, enums).

## Requirements

- Node.js 18 or newer.
- A working scouting.org account (parent or leader). The data the API returns is whatever your account already has permission to view.

## Quick start

```bash
git clone <this repo>
cd scouting-america-mcp
npm install
npm run build

cp env.example .env
# edit .env and fill in SCOUT_USERNAME / SCOUT_PASSWORD

npm start          # HTTP server (Cursor, MCP Inspector, mcp-remote)
# or
npm run start:stdio  # stdio server (Claude Desktop spawns this directly; rarely run by hand)
```

The HTTP server listens on `http://localhost:3032` by default.

- Health check: `curl http://localhost:3032/health`
- MCP endpoint: `http://localhost:3032/mcp` (Streamable HTTP transport)

## Connect from the MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Then point it at `http://localhost:3032/mcp` and you should see all 32 tools.

## Connect from Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "scouting-america": {
      "url": "http://localhost:3032/mcp"
    }
  }
}
```

## Connect from Claude Desktop

Claude Desktop expects stdio servers, so the build ships a dedicated stdio entrypoint (`dist/stdio.js`). Claude Desktop spawns it directly — no separate HTTP server has to be running.

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows) and add:

```json
{
  "mcpServers": {
    "scouting-america": {
      "command": "node",
      "args": ["/absolute/path/to/scouting-api-mcp/dist/stdio.js"],
      "env": {
        "SCOUT_USERNAME": "your-username",
        "SCOUT_PASSWORD": "your-password"
      }
    }
  }
}
```

Then fully quit and re-open Claude Desktop. The 32 tools should appear in the tools menu.

If you'd rather drive the HTTP server (e.g. you already keep `npm start` running for Cursor / MCP Inspector), you can bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) instead:

```json
{
  "mcpServers": {
    "scouting-america": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3032/mcp"]
    }
  }
}
```

## Configuration

| Env var | Required | Purpose |
| --- | --- | --- |
| `SCOUT_USERNAME` | yes | scouting.org username (the my.scouting.org / Scoutbook Plus login — not necessarily your email). |
| `SCOUT_PASSWORD` | yes | scouting.org password. |
| `SCOUT_USER_ID` | no | Override the numeric `userId` returned by login. Useful if you want the default `userId` for tools to be a child instead of yourself. |
| `PORT` | no | HTTP port. Defaults to `3032`. |

The server reads `.env` (via `dotenv`) at startup, so `SCOUT_*` can live there or be exported in your shell.

## Auth model

On the first tool call the server logs into `https://auth.scouting.org/api/users/<username>/authenticate` with a JSON body `{"password":"…"}` and `Accept: application/json; version=2`. The response includes a JWT (`token`, ~8h lifetime) and an `account.userId`. The server caches `{ token, username, userId, exp }` in memory and refreshes ~60 seconds before `exp`. The bearer is attached to every `api.scouting.org` request.

The token is **never** logged or echoed in responses, and the client strips `Authorization` from any headers returned to callers (e.g. by `api_request`).

## Example tool calls

```jsonc
// Who am I?
{ "name": "whoami", "arguments": {} }

// All current ranks
{ "name": "list_ranks", "arguments": { "status": "active" } }

// My (or my child's) rank progress
{ "name": "get_youth_ranks", "arguments": { "userId": 12345678 } }

// One requirement set
{
  "name": "get_rank_requirements",
  "arguments": { "rankId": 14, "versionId": 105 }
}

// Anything else (escape hatch)
{
  "name": "api_request",
  "arguments": {
    "path": "/advancements/v2/youth/12345678/awards",
    "method": "GET"
  }
}
```

## Development

```bash
npm run dev         # node --watch via tsx
npm run type-check  # tsc --noEmit
npm test            # node --test (mocked fetch; no network)
npm run build       # tsc → dist/
```

## Trademarks

"Scouting America" and "Boy Scouts of America" are trademarks of the Boy Scouts of America. This project is an independent, third-party integration and is not affiliated with, endorsed by, sponsored by, or in any way officially connected to the Boy Scouts of America or Scouting America. All product and company names are the property of their respective owners; references are for identification purposes only.

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 Alex Frazer.
