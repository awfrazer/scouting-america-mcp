#!/usr/bin/env node
import "dotenv/config";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  if (!process.env.SCOUT_USERNAME || !process.env.SCOUT_PASSWORD) {
    // stderr only — stdout is the MCP transport channel and must stay clean.
    console.error(
      "[scouting-america-mcp] SCOUT_USERNAME / SCOUT_PASSWORD are not set; tool calls will fail until they are.",
    );
  }

  const server = createMcpServer();
  const transport = new StdioServerTransport();

  const shutdown = async (): Promise<void> => {
    try {
      await transport.close();
    } catch {
      // ignore
    }
    try {
      await server.close();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  await server.connect(transport);
}

main().catch((err) => {
  console.error(
    "[scouting-america-mcp] fatal:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
