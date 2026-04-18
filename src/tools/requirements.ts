import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";

registerTool(
  "get_rank",
  {
    description:
      "Gets the full definition of a single rank by numeric id. The response includes a `versions[]` array — pick the appropriate `versionId` for `get_rank_requirements`.",
    inputSchema: {
      type: "object",
      properties: {
        rankId: {
          type: ["string", "number"],
          description: "Numeric rank id, e.g. 14 (Tenderfoot).",
        },
      },
      required: ["rankId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(`/advancements/v2/ranks/${args.rankId}`);
    return createToolResponse(data);
  },
);

registerTool(
  "get_rank_requirements",
  {
    description:
      "Gets the full requirement text for a specific rank version. Both `rankId` and `versionId` are required; `versionId` comes from `get_rank`'s `versions[]` array.",
    inputSchema: {
      type: "object",
      properties: {
        rankId: { type: ["string", "number"] },
        versionId: { type: ["string", "number"] },
      },
      required: ["rankId", "versionId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/ranks/${args.rankId}/requirements`,
      { versionId: args.versionId as string | number },
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_adventure",
  {
    description:
      "Gets the full definition of a single Cub Scout adventure by numeric id. Includes a `versions[]` array for `get_adventure_requirements`.",
    inputSchema: {
      type: "object",
      properties: {
        adventureId: { type: ["string", "number"] },
      },
      required: ["adventureId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/adventures/${args.adventureId}`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_adventure_requirements",
  {
    description:
      "Gets the full requirement text for a specific adventure version. Note: this is a v1 path even though `get_adventure` is v2.",
    inputSchema: {
      type: "object",
      properties: {
        adventureId: { type: ["string", "number"] },
        versionId: { type: ["string", "number"] },
      },
      required: ["adventureId", "versionId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/adventures/${args.adventureId}/requirements`,
      { versionId: args.versionId as string | number },
    );
    return createToolResponse(data);
  },
);
