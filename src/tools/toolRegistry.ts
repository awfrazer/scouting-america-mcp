import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  type CallToolResult,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { createScoutingClient, type ScoutingClient } from "./client.js";
import { createErrorResponse, type ToolResponse } from "./responses.js";

export interface ToolDefinition {
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export type ToolHandler = (
  args: Record<string, unknown>,
  client: ScoutingClient,
) => Promise<ToolResponse>;

interface RegisteredTool {
  name: string;
  definition: ToolDefinition;
  handler: ToolHandler;
}

const registry = new Map<string, RegisteredTool>();

export function registerTool(
  name: string,
  definition: ToolDefinition,
  handler: ToolHandler,
): void {
  if (registry.has(name)) {
    throw new Error(`Tool already registered: ${name}`);
  }
  registry.set(name, { name, definition, handler });
}

export function listRegisteredTools(): RegisteredTool[] {
  return Array.from(registry.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function attachHandlers(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = listRegisteredTools().map((t) => ({
      name: t.name,
      description: t.definition.description,
      inputSchema: t.definition.inputSchema,
      ...(t.definition.outputSchema
        ? { outputSchema: t.definition.outputSchema }
        : {}),
      ...(t.definition.annotations
        ? { annotations: t.definition.annotations }
        : {}),
    }));
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const { name, arguments: rawArgs } = request.params;
    const tool = registry.get(name);
    if (!tool) {
      return createErrorResponse(`Unknown tool: ${name}`) as unknown as CallToolResult;
    }
    try {
      const client = await createScoutingClient();
      const args = (rawArgs ?? {}) as Record<string, unknown>;
      const result = await tool.handler(args, client);
      return result as unknown as CallToolResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return createErrorResponse(message) as unknown as CallToolResult;
    }
  });
}
