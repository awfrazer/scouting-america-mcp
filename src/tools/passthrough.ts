import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";

registerTool(
  "api_request",
  {
    description:
      "Generic passthrough to api.scouting.org. Use this for endpoints that don't yet have a dedicated tool. Always sent against https://api.scouting.org with the cached bearer attached. Returns `{ status, headers, body }` and does NOT throw on non-2xx, so you can inspect the upstream error.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "API path beginning with /, e.g. /advancements/v2/youth/12345678/awards.",
        },
        method: {
          type: "string",
          enum: ["GET", "POST"],
          default: "GET",
        },
        query: {
          type: "object",
          description: "Optional query params (key/value).",
          additionalProperties: true,
        },
        body: {
          description: "Optional JSON body for POST requests.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        status: { type: "number" },
        headers: { type: "object" },
        body: {},
      },
      required: ["status", "headers"],
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const path = args.path as string;
    if (!path || typeof path !== "string") {
      throw new Error("`path` is required and must be a string");
    }
    const method = (args.method as "GET" | "POST" | undefined) ?? "GET";
    const query = args.query as Record<string, string | number | boolean | undefined | null> | undefined;
    const body = args.body;
    const result = await client.rawRequest(path, { method, query, body });
    return createToolResponse(result);
  },
);
