import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";

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
