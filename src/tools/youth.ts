import { getCurrentUserId } from "../session.js";
import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";

async function resolveUserId(args: Record<string, unknown>): Promise<string> {
  const provided = args.userId;
  if (provided !== undefined && provided !== null && provided !== "") {
    return String(provided);
  }
  return getCurrentUserId();
}

registerTool(
  "get_youth_leadership_history",
  {
    description:
      "Returns a youth's leadership position history. `userId` defaults to the authenticated user. `summary=true` returns an abbreviated response.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
        summary: { type: "boolean", default: false },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId = await resolveUserId(args);
    const data = await client.get(
      `/advancements/youth/${userId}/leadershipPositionHistory`,
      { summary: args.summary as boolean | undefined },
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_youth_ranks",
  {
    description:
      "Returns a youth's current rank progress (one entry per program). `userId` defaults to the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId = await resolveUserId(args);
    const data = await client.get(
      `/advancements/v2/youth/${userId}/ranks`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_youth_adventures",
  {
    description:
      "Returns a youth's Cub Scout adventure progress. `userId` defaults to the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId = await resolveUserId(args);
    const data = await client.get(
      `/advancements/v2/youth/${userId}/adventures`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_youth_awards",
  {
    description:
      "Returns a youth's earned/in-progress awards. `userId` defaults to the authenticated user. May return an empty list.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId = await resolveUserId(args);
    const data = await client.get(
      `/advancements/v2/youth/${userId}/awards`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_youth_advancement_requirements",
  {
    description:
      "Returns the youth's per-requirement progress for one specific advancement (rank, adventure, award, or merit badge). `userId` defaults to the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
        advancementType: {
          type: "string",
          enum: ["ranks", "adventures", "awards", "meritBadges"],
        },
        advancementId: { type: ["string", "number"] },
      },
      required: ["advancementType", "advancementId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId = await resolveUserId(args);
    const data = await client.get(
      `/advancements/v2/youth/${userId}/${args.advancementType}/${args.advancementId}/requirements`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_user_activity_summary",
  {
    description:
      "Returns a user's lifetime activity totals (hiking miles, camping nights, service hours). `userId` defaults to the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId = await resolveUserId(args);
    const data = await client.get(
      `/advancements/v2/${userId}/userActivitySummary`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_payment_logs",
  {
    description:
      "Returns the payment-log history for a user within a unit. Both `userId` (defaults to authenticated user) and `unitId` (required) are needed; find a unitId in the personprofile's `organizationPositions` or via `get_my_scout`.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
        unitId: { type: ["string", "number"] },
      },
      required: ["unitId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId = await resolveUserId(args);
    const data = await client.get(
      `/advancements/${userId}/paymentLogs`,
      { unitId: args.unitId as string | number },
    );
    return createToolResponse(data);
  },
);
