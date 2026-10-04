import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";

registerTool(
  "list_organization_adults",
  {
    description:
      "Lists adult members (leaders, committee, functional roles) registered in a unit organization. POST-as-filter; returns organizationInfo and a members array with positions, contact info, YPT status, and registration details. Requires the organization's UUID (`organizationGuid`).",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description:
            "Organization UUID (e.g. 504992AD-1D27-46EA-B7A7-14F4BD5C8B41).",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.postFilter(
      `/organizations/v2/${args.organizationGuid}/adults`,
      {},
    );
    return createToolResponse(data);
  },
);

registerTool(
  "list_organization_youths",
  {
    description:
      "Lists youth members registered in a unit organization. Returns unit info and a users array with rank progress, contact info, positions, patrol assignments, and date joined. Requires the organization's UUID (`organizationGuid`).",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description:
            "Organization UUID (e.g. 504992AD-1D27-46EA-B7A7-14F4BD5C8B41).",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/units/${args.organizationGuid}/youths`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "list_unit_parents",
  {
    description:
      "Lists parents/guardians registered in a unit organization. Returns parent contact info and linked youth. Requires the organization's UUID (`organizationGuid`).",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description:
            "Organization UUID (e.g. 504992AD-1D27-46EA-B7A7-14F4BD5C8B41).",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/units/${args.organizationGuid}/parents`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "list_sub_units",
  {
    description:
      "Lists sub-units (dens, patrols, crews) within a unit organization. Returns sub-unit names, types, and member counts. Requires the organization's UUID (`organizationGuid`).",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description:
            "Organization UUID (e.g. 504992AD-1D27-46EA-B7A7-14F4BD5C8B41).",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/units/${args.organizationGuid}/subUnits`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_advancement_dashboard",
  {
    description:
      "Returns the unit advancement dashboard summary showing overall progress across all youth. Requires the organization's UUID (`organizationGuid`).",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description:
            "Organization UUID (e.g. 504992AD-1D27-46EA-B7A7-14F4BD5C8B41).",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/${args.organizationGuid}/advancementDashboard`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_advancements_ready_to_award",
  {
    description:
      "Returns advancements that are approved and ready to be awarded/purchased for a unit. Useful for generating purchase orders. Requires the organization's UUID and an advancementType.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description:
            "Organization UUID (e.g. 504992AD-1D27-46EA-B7A7-14F4BD5C8B41).",
        },
        advancementType: {
          type: "string",
          enum: ["rank", "meritBadge", "award", "adventure"],
          description: "Type of advancements to retrieve.",
        },
      },
      required: ["organizationGuid", "advancementType"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.postJson(
      `/organizations/${args.organizationGuid}/advancementsReadyToBeAwarded`,
      [],
      { advancementType: args.advancementType as string },
    );
    return createToolResponse(data);
  },
);

registerTool(
  "list_unit_leadership_positions",
  {
    description:
      "Lists current leadership positions in a unit (Scoutmaster, ASMs, committee members, etc.). Requires the organization's UUID (`organizationGuid`).",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description:
            "Organization UUID (e.g. 504992AD-1D27-46EA-B7A7-14F4BD5C8B41).",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/units/${args.organizationGuid}/leadershipPositions`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "search_merit_badge_counselors",
  {
    description:
      "Search for merit badge counselors. The upstream requires a valid filter combination — typically memberId + email, OR lastName + zipCode (optionally with radius). meritBadgeId narrows results to counselors for that badge. Supplying no criteria is rejected locally. POST-as-filter.",
    inputSchema: {
      type: "object",
      properties: {
        meritBadgeId: {
          type: ["string", "number"],
          description: "Numeric merit badge ID to narrow counselors to one badge.",
        },
        zipCode: {
          type: "string",
          description: "ZIP code for geographic search (pair with lastName).",
        },
        radius: {
          type: "number",
          description: "Search radius in miles (used with zipCode).",
        },
        lastName: {
          type: "string",
          description: "Counselor last name (pair with zipCode).",
        },
        email: {
          type: "string",
          description: "Counselor email (pair with memberId).",
        },
        memberId: {
          type: ["string", "number"],
          description: "Counselor member ID (pair with email).",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const body: Record<string, unknown> = {};
    if (args.meritBadgeId !== undefined) body.meritBadgeId = args.meritBadgeId;
    if (args.zipCode !== undefined) body.zipCode = args.zipCode;
    if (args.radius !== undefined) body.radius = args.radius;
    if (args.lastName !== undefined) body.lastName = args.lastName;
    if (args.email !== undefined) body.email = args.email;
    if (args.memberId !== undefined) body.memberId = args.memberId;
    if (Object.keys(body).length === 0) {
      throw new Error(
        "search_merit_badge_counselors requires at least one filter " +
          "(e.g. lastName + zipCode, or memberId + email).",
      );
    }
    const data = await client.postFilter(
      "/advancements/v2/meritBadges/counselors/search",
      body,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_org_merit_badge_progress",
  {
    description:
      "Returns per-user requirement progress for a specific merit badge across all youth in a unit. Useful for tracking which scouts have completed which requirements.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID.",
        },
        meritBadgeId: {
          type: ["string", "number"],
          description: "Numeric merit badge ID.",
        },
      },
      required: ["organizationGuid", "meritBadgeId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/organization/${args.organizationGuid}/meritBadges/${args.meritBadgeId}/userRequirements`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_org_rank_progress",
  {
    description:
      "Returns per-user requirement progress for a specific rank across all youth in a unit.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID.",
        },
        rankId: {
          type: ["string", "number"],
          description: "Numeric rank ID.",
        },
      },
      required: ["organizationGuid", "rankId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/organization/${args.organizationGuid}/ranks/${args.rankId}/userRequirements`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_org_adventure_progress",
  {
    description:
      "Returns per-user requirement progress for a specific adventure across all youth in a unit.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID.",
        },
        adventureId: {
          type: ["string", "number"],
          description: "Numeric adventure ID.",
        },
      },
      required: ["organizationGuid", "adventureId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/organization/${args.organizationGuid}/adventures/${args.adventureId}/userRequirements`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_org_award_progress",
  {
    description:
      "Returns per-user requirement progress for a specific award across all youth in a unit.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID.",
        },
        awardId: {
          type: ["string", "number"],
          description: "Numeric award ID.",
        },
      },
      required: ["organizationGuid", "awardId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/organization/${args.organizationGuid}/awards/${args.awardId}/userRequirements`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_org_payment_logs",
  {
    description:
      "Returns unit-wide payment log summary for an organization.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID.",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/organization/${args.organizationGuid}/paymentLogs`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_unit_activities_dashboard",
  {
    description:
      "Returns the unit activities dashboard summary. Requires the organization's UUID.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID.",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/${args.organizationGuid}/unitActivitiesDashboard`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "search_units",
  {
    description:
      "Search for Scouting units by various criteria. Returns matching units with basic info. POST-as-filter.",
    inputSchema: {
      type: "object",
      properties: {
        unitNumber: { type: "string", description: "Unit number to search for." },
        unitType: { type: "string", description: "Unit type (e.g. 'troop', 'pack', 'crew')." },
        zip: { type: "string", description: "ZIP code for geographic search." },
        state: { type: "string", description: "State abbreviation (e.g. 'MA')." },
        councilNo: { type: ["string", "number"], description: "Council number." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const body: Record<string, unknown> = {};
    if (args.unitNumber !== undefined) body.unitNumber = args.unitNumber;
    if (args.unitType !== undefined) body.unitType = args.unitType;
    if (args.zip !== undefined) body.zip = args.zip;
    if (args.state !== undefined) body.state = args.state;
    if (args.councilNo !== undefined) body.councilNo = args.councilNo;
    const data = await client.postFilter("/organizations/units/search", body);
    return createToolResponse(data);
  },
);

registerTool(
  "get_mbc_profile",
  {
    description:
      "Returns a merit badge counselor's profile including contact info and badges they counsel. Accepts a memberId or personGuid.",
    inputSchema: {
      type: "object",
      properties: {
        memberId: {
          type: ["string", "number"],
          description: "Counselor's numeric member ID or personGuid.",
        },
      },
      required: ["memberId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/meritBadges/counselors/${args.memberId}/profile`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_mbc_dashboard",
  {
    description:
      "Returns a merit badge counselor's dashboard showing assigned youths and badge progress. Accepts a personGuid or memberId.",
    inputSchema: {
      type: "object",
      properties: {
        personGuidOrMID: {
          type: "string",
          description: "Counselor's personGuid or member ID.",
        },
      },
      required: ["personGuidOrMID"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/advancements/v2/meritBadges/counselors/${args.personGuidOrMID}/dashboard`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_mbc_assigned_youths",
  {
    description:
      "Returns youths currently assigned to merit badge counselors. POST-as-filter.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (_args, client) => {
    const data = await client.postFilter(
      "/advancements/v2/meritBadges/counselors/youths/assigned",
      {},
    );
    return createToolResponse(data);
  },
);

registerTool(
  "search_camps",
  {
    description:
      "Search for Scouting camps. POST-as-filter.",
    inputSchema: {
      type: "object",
      properties: {
        zip: { type: "string", description: "ZIP code for geographic search." },
        radius: { type: "number", description: "Search radius in miles." },
        councilNo: { type: ["string", "number"], description: "Council number." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const body: Record<string, unknown> = {};
    if (args.zip !== undefined) body.zip = args.zip;
    if (args.radius !== undefined) body.radius = args.radius;
    if (args.councilNo !== undefined) body.councilNo = args.councilNo;
    const data = await client.postFilter("/organizations/camps/search", body);
    return createToolResponse(data);
  },
);

registerTool(
  "search_orgs_nearby",
  {
    description:
      "Search for Scouting organizations within a radius of a location. POST-as-filter.",
    inputSchema: {
      type: "object",
      properties: {
        zip: { type: "string", description: "ZIP code center point." },
        radius: { type: "number", description: "Search radius in miles." },
        orgType: { type: "string", description: "Organization type filter." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const body: Record<string, unknown> = {};
    if (args.zip !== undefined) body.zip = args.zip;
    if (args.radius !== undefined) body.radius = args.radius;
    if (args.orgType !== undefined) body.orgType = args.orgType;
    const data = await client.postFilter("/organizations/organizationsWithinRadius", body);
    return createToolResponse(data);
  },
);

registerTool(
  "list_pending_leadership",
  {
    description:
      "Lists pending (unapproved) leadership position requests in a unit. Requires the organization's UUID.",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID.",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/units/${args.organizationGuid}/pendingLeadershipPositions`,
    );
    return createToolResponse(data);
  },
);

registerTool(
  "get_organization_profile",
  {
    description:
      "Fetches the profile (council/district/unit metadata) for an organization. Requires the organization's UUID (`organizationGuid`).",
    inputSchema: {
      type: "object",
      properties: {
        organizationGuid: {
          type: "string",
          description: "Organization UUID (e.g. F45624D7-0998-41F5-86F6-26061D93324E).",
        },
      },
      required: ["organizationGuid"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const data = await client.get(
      `/organizations/v2/${args.organizationGuid}/profile`,
    );
    return createToolResponse(data);
  },
);
