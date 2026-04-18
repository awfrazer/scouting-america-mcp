import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";


registerTool(
  "list_ranks",
  {
    description:
      "Lists all rank definitions across Scouting America programs. Returns `{ ranks: [...] }`. Optional filters: status (e.g. \"active\"), version, programId, id.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by rank status, e.g. \"active\".",
        },
        version: { type: "string" },
        programId: { type: ["string", "number"] },
        id: { type: ["string", "number"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get("/advancements/ranks", {
      status: args.status as string | undefined,
      version: args.version as string | undefined,
      programId: args.programId as string | number | undefined,
      id: args.id as string | number | undefined,
    });
    return createToolResponse(data);
  },
);

registerTool(
  "list_adventures",
  {
    description:
      "Lists all Cub Scout adventure definitions. Returns `{ adventures: [...] }`.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (_args, client) => {
    const data = await client.get("/advancements/adventures");
    return createToolResponse(data);
  },
);

registerTool(
  "list_awards",
  {
    description:
      "Lists all award definitions across Scouting America programs. Returns `{ awards: [...] }`.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (_args, client) => {
    const data = await client.get("/advancements/awards");
    return createToolResponse(data);
  },
);

registerTool(
  "list_merit_badges",
  {
    description:
      "Lists all merit badge definitions. Returns `{ meritBadges: [...] }`.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (_args, client) => {
    const data = await client.get("/advancements/meritBadges");
    return createToolResponse(data);
  },
);

registerTool(
  "list_ss_electives",
  {
    description:
      "Lists Sea Scout electives. Returns a bare array of elective objects.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (_args, client) => {
    const data = await client.get("/advancements/ssElectives");
    return createToolResponse(data);
  },
);
