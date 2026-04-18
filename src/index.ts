#!/usr/bin/env node
import "dotenv/config";

import { startServer } from "./server.js";

function parsePort(): number {
  const raw = process.env.PORT;
  if (!raw) return 3032;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0 || n > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return n;
}

function main(): void {
  if (!process.env.SCOUT_USERNAME || !process.env.SCOUT_PASSWORD) {
    console.warn(
      "[scouting-america-mcp] SCOUT_USERNAME / SCOUT_PASSWORD are not set; tool calls will fail until they are. Copy env.example to .env and fill them in.",
    );
  }
  startServer(parsePort());
}

main();
