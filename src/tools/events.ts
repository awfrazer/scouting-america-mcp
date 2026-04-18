import { getCurrentUserId } from "../session.js";
import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";


registerTool(
  "list_unit_events",
  {
    description:
      "Lists unit events in a date range. POST-as-filter; returns a bare array. `unitId` is required; you can find one via `get_my_scout` or the personprofile.",
    inputSchema: {
      type: "object",
      properties: {
        unitId: { type: ["string", "number"] },
        fromDate: {
          type: "string",
          description: "Inclusive start date (YYYY-MM-DD).",
        },
        toDate: {
          type: "string",
          description: "Inclusive end date (YYYY-MM-DD).",
        },
        showDLEvents: {
          type: "boolean",
          description: "Include den-leader / sub-org events.",
          default: false,
        },
      },
      required: ["unitId", "fromDate", "toDate"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.postFilter(
      "/advancements/events",
      {
        unitId:
          typeof args.unitId === "string"
            ? Number.parseInt(args.unitId, 10)
            : args.unitId,
        fromDate: args.fromDate,
        toDate: args.toDate,
        showDLEvents: (args.showDLEvents as boolean | undefined) ?? false,
      },
      { swCache: true },
    );
    return createToolResponse(data);
  },
);

registerTool(
  "list_activities",
  {
    description:
      "Lists advancement activities (hikes, camping, service, etc.) for an organization in a date range. Returns `{ totalActivities, activities }`. Use pagination via `page` (1-indexed) and `perPage`.",
    inputSchema: {
      type: "object",
      properties: {
        hostOrganizationGuid: {
          type: "string",
          description: "Hosting organization UUID.",
        },
        startDate: { type: "string", description: "YYYY-MM-DD." },
        endDate: { type: "string", description: "YYYY-MM-DD." },
        includeActivities: {
          type: "string",
          enum: ["both", "approved", "pending"],
          default: "both",
        },
        page: { type: "number", default: 1 },
        perPage: { type: "number", default: 25 },
      },
      required: ["hostOrganizationGuid", "startDate", "endDate"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.postFilter(
      "/advancements/v2/activities",
      {
        hostOrganizationGuid: args.hostOrganizationGuid,
        startDate: args.startDate,
        endDate: args.endDate,
        includeActivities:
          (args.includeActivities as string | undefined) ?? "both",
      },
      {
        page: (args.page as number | undefined) ?? 1,
        perPage: (args.perPage as number | undefined) ?? 25,
      },
    );
    return createToolResponse(data);
  },
);

registerTool(
  "list_advancement_comments",
  {
    description:
      "Lists comments attached to one specific advancement (rank/adventure/award/meritBadge) for a user. Despite the POST verb, this is a read — the body is a filter, not a new comment. Returns a bare array. `userId` defaults to the authenticated user.",
    inputSchema: {
      type: "object",
      properties: {
        userId: { type: ["string", "number"] },
        advancementId: { type: ["string", "number"] },
        advancementType: {
          type: "string",
          enum: ["ranks", "adventures", "awards", "meritBadges"],
        },
        versionId: { type: ["string", "number"] },
      },
      required: ["advancementId", "advancementType", "versionId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const userId =
      args.userId !== undefined && args.userId !== null && args.userId !== ""
        ? String(args.userId)
        : await getCurrentUserId();
    const data = await client.postFilter(
      `/advancements/v2/users/${userId}/comments`,
      {
        advancementId:
          typeof args.advancementId === "string"
            ? Number.parseInt(args.advancementId, 10)
            : args.advancementId,
        advancementType: args.advancementType,
        versionId:
          typeof args.versionId === "string"
            ? Number.parseInt(args.versionId, 10)
            : args.versionId,
      },
    );
    return createToolResponse(data);
  },
);
