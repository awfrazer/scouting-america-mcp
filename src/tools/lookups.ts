import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";

const LOOKUP_CATEGORIES = [
  "address/countries",
  "address/states",
  "advancements/positions",
  "advancements/swimmingClassification",
  "advancements/youthLeadershipPositions",
  "advancements/calendarEventTypes",
  "advancements/activityCategories",
  "advancements/unitTimezone",
  "communications/communicationTypes",
  "communications/mobilePhoneCarrier",
  "communications/phoneCountryCodes",
  "person/grades",
  "person/nameSuffixes",
  "person/titlePrefixes",
  "person/positions",
  "person/relationshipTypes",
  "person/schools",
  "registrations/renewalOptoutReasons",
] as const;

registerTool(
  "lookup",
  {
    description:
      "Fetches a static reference list (countries, states, positions, schools, etc.). Pass one of the supported category values; returns the upstream lookup response (typically an array of objects).",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: [...LOOKUP_CATEGORIES],
          description: "Lookup category. Maps to /lookups/<category>.",
        },
      },
      required: ["category"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  async (args, client) => {
    const category = args.category as string;
    if (!LOOKUP_CATEGORIES.includes(category as (typeof LOOKUP_CATEGORIES)[number])) {
      throw new Error(`Unsupported lookup category: ${category}`);
    }
    const data = await client.get(`/lookups/${category}`);
    return createToolResponse(data);
  },
);
