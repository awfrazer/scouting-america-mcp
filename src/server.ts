import cors from "cors";
import express, { type Request, type Response } from "express";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { attachHandlers } from "./tools/index.js";

const SERVER_NAME = "Scouting America MCP";
const SERVER_VERSION = "0.1.0";

export function createMcpServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );
  attachHandlers(server);
  return server;
}

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "scouting-america-mcp" });
  });

  const mcpHandler = async (req: Request, res: Response): Promise<void> => {
    let transport: StreamableHTTPServerTransport | undefined;
    let server: Server | undefined;
    try {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      server = createMcpServer();

      res.on("close", () => {
        transport?.close().catch(() => {});
        server?.close().catch(() => {});
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error(
        "MCP request failed:",
        err instanceof Error ? err.message : err,
      );
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
      transport?.close().catch(() => {});
      server?.close().catch(() => {});
    }
  };

  app.all("/mcp", mcpHandler);

  return app;
}

export function startServer(port: number): void {
  const app = createApp();
  app.listen(port, () => {
    console.log(
      `${SERVER_NAME} v${SERVER_VERSION} listening on http://localhost:${port}`,
    );
    console.log(`  health: GET  http://localhost:${port}/health`);
    console.log(`  mcp:    ALL  http://localhost:${port}/mcp`);
  });
}
