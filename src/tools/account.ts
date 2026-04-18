import { getScoutingSession } from "../session.js";
import { createToolResponse } from "./responses.js";
import { registerTool } from "./toolRegistry.js";

registerTool(
  "whoami",
  {
    description:
      "Returns the cached login session: userId, username, personGuid, and the bearer token's expiration time (ISO 8601). Does not call the upstream API. The `personGuid` is the authenticated user's own UUID (useful for feeding into `get_person_*` tools).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        userId: { type: "string" },
        username: { type: "string" },
        personGuid: { type: "string" },
        tokenExpiresAt: { type: "string" },
      },
      required: ["userId", "username", "tokenExpiresAt"],
    },
    annotations: { readOnlyHint: true },
  },
  async () => {
    const session = await getScoutingSession();
    return createToolResponse({
      userId: session.userId,
      username: session.username,
      personGuid: session.personGuid,
      tokenExpiresAt: new Date(session.exp * 1000).toISOString(),
    });
  },
);
