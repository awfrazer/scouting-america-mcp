import { getCurrentUserId } from "../session.js";
import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";


registerTool(
  "get_person_profile",
  {
    description:
      "Gets a person's full profile. `personId` accepts either a numeric userId (e.g. \"12345678\") or a UUID personGuid. Adult profiles include hobbies/education/pictures; youth profiles include advancementInfo/currentProgramsAndRanks/parentsGuardiansInfo.",
    inputSchema: {
      type: "object",
      properties: {
        personId: {
          type: "string",
          description: "Numeric userId or UUID personGuid (as a string).",
        },
      },
      required: ["personId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/persons/v2/${args.personId}/personprofile`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_person_relationships",
  {
    description:
      "Lists relationships (e.g. parent → child) for a person. Requires UUID `personGuid`. `includeIneligibles` controls whether expired/ineligible relationships are returned.",
    inputSchema: {
      type: "object",
      properties: {
        personGuid: { type: "string" },
        includeIneligibles: { type: "boolean", default: false },
      },
      required: ["personGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/persons/v2/${args.personGuid}/relationships`,
      { includeIneligibles: args.includeIneligibles as boolean | undefined },
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_person_role_types",
  {
    description:
      "Returns the role types (registered positions) a person currently holds. Requires UUID `personGuid`.",
    inputSchema: {
      type: "object",
      properties: {
        personGuid: { type: "string" },
        includeParentRoles: { type: "boolean", default: false },
        includeScoutbookRoles: { type: "boolean", default: false },
      },
      required: ["personGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(`/persons/${args.personGuid}/roleTypes`, {
      includeParentRoles: args.includeParentRoles as boolean | undefined,
      includeScoutbookRoles: args.includeScoutbookRoles as boolean | undefined,
    });
    return createToolResponse(data);
  },
);

registerTool(
  "get_person_subscriptions",
  {
    description:
      "Returns the magazine/communication subscriptions for a person. Requires UUID `personGuid`.",
    inputSchema: {
      type: "object",
      properties: {
        personGuid: { type: "string" },
      },
      required: ["personGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/persons/${args.personGuid}/subscriptions`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_person_renewal_relationships",
  {
    description:
      "Returns the renewal-eligibility relationships for a person (used by the membership-renewal flow). Requires UUID `personGuid`.",
    inputSchema: {
      type: "object",
      properties: {
        personGuid: { type: "string" },
      },
      required: ["personGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/persons/${args.personGuid}/renewalRelationships`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_person_ypt_training",
  {
    description:
      "Returns the Youth Protection Training (YPT) status for a person. Requires UUID `personGuid`.",
    inputSchema: {
      type: "object",
      properties: {
        personGuid: { type: "string" },
      },
      required: ["personGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/persons/v2/${args.personGuid}/trainings/ypt`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_parent_guardian_invitation",
  {
    description:
      "Returns the parent/guardian invitation status for a person (used in the youth registration flow). Requires UUID `personGuid`.",
    inputSchema: {
      type: "object",
      properties: {
        personGuid: { type: "string" },
      },
      required: ["personGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/persons/v2/${args.personGuid}/parentGuardianInvitation`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "list_membership_registrations",
  {
    description:
      "Lists membership registrations for a person, filtered by status and (optionally) organization. POST-as-filter; returns a bare array. May be empty for users with no matching registrations.",
    inputSchema: {
      type: "object",
      properties: {
        personGuid: { type: "string" },
        status: {
          type: "array",
          items: { type: "string" },
          description: "Status filter, e.g. [\"current\"].",
          default: ["current"],
        },
        organizationGuid: {
          type: "string",
          description: "Optional organization UUID to scope the results.",
        },
      },
      required: ["personGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const body: Record<string, unknown> = {
      status: (args.status as string[] | undefined) ?? ["current"],
    };
    if (args.organizationGuid) {
      body.organizationGuid = args.organizationGuid;
    }
    const data = await client.postFilter(
      `/persons/v2/${args.personGuid}/membershipRegistrations`,
      body,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_my_scout",
  {
    description:
      'Returns the "My Scout" summary for a numeric userId. Useful one-call overview of a youth\'s program/unit/rank state. `userId` is optional and defaults to the authenticated user.',
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
    const userId =
      (args.userId as string | number | undefined) ??
      (await getCurrentUserId());
    const data = await client.get(`/persons/${userId}/myScout`);
    return createToolResponse(data);
  },
);
