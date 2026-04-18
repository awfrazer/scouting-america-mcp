import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { listRegisteredTools } from "../src/tools/index.js";

// Tool names intentionally have no `scouting_` prefix: MCP clients namespace
// tools by server (e.g. Cursor exposes them as `scouting-america.<name>`), so
// adding our own prefix is redundant and burns through the 60-char combined
// `serverName.toolName` budget that some clients enforce.
const EXPECTED_TOOLS = [
  "api_request",
  "get_adventure",
  "get_adventure_requirements",
  "get_my_scout",
  "get_organization_profile",
  "get_parent_guardian_invitation",
  "get_payment_logs",
  "get_person_profile",
  "get_person_relationships",
  "get_person_renewal_relationships",
  "get_person_role_types",
  "get_person_subscriptions",
  "get_person_ypt_training",
  "get_rank",
  "get_rank_requirements",
  "get_user_activity_summary",
  "get_youth_advancement_requirements",
  "get_youth_adventures",
  "get_youth_awards",
  "get_youth_leadership_history",
  "get_youth_ranks",
  "list_activities",
  "list_advancement_comments",
  "list_adventures",
  "list_awards",
  "list_membership_registrations",
  "list_merit_badges",
  "list_ranks",
  "list_ss_electives",
  "list_unit_events",
  "lookup",
  "whoami",
];

// Only tools that BUILD their own response (i.e. we control the exact shape)
// are allowed to declare an `outputSchema`. Every upstream-passthrough tool
// must omit it: we don't reliably know the upstream shape, and a wrong
// outputSchema causes the SDK to reject responses with either
//   -32602 "Invalid tools/call result: expected record, received array"
// (when structuredContent doesn't match) or
//   -32600 "Tool X has an output schema but did not return structured content"
// (when the helper skips structuredContent for arrays/primitives). Keeping the
// allow-list tiny avoids both classes of bug.
const TOOLS_WITH_OUTPUT_SCHEMA = new Set(["whoami", "api_request"]);

describe("tool registry", () => {
  const tools = listRegisteredTools();

  it("registers all 32 expected tools", () => {
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, [...EXPECTED_TOOLS].sort());
    assert.equal(names.length, 32);
  });

  it("every tool has no redundant `scouting_` prefix and has a description + inputSchema", () => {
    for (const t of tools) {
      assert.doesNotMatch(
        t.name,
        /^scouting[_-]/,
        `${t.name} should not carry a scouting_ prefix; the MCP server already namespaces it`,
      );
      assert.match(
        t.name,
        /^[a-z][a-z0-9_]*$/,
        `${t.name} must be lowercase snake_case`,
      );
      assert.ok(
        t.definition.description && t.definition.description.length > 5,
        `${t.name} needs a real description`,
      );
      assert.equal(
        t.definition.inputSchema.type,
        "object",
        `${t.name} inputSchema must be an object`,
      );
      assert.deepEqual(
        t.definition.annotations,
        { readOnlyHint: true },
        `${t.name} must declare readOnlyHint: true`,
      );
    }
  });

  it("only the allow-listed tools declare outputSchema; everything else omits it", () => {
    for (const t of tools) {
      const hasSchema = t.definition.outputSchema !== undefined;
      const shouldHaveSchema = TOOLS_WITH_OUTPUT_SCHEMA.has(t.name);
      assert.equal(
        hasSchema,
        shouldHaveSchema,
        shouldHaveSchema
          ? `${t.name} should declare outputSchema (it constructs its own response shape)`
          : `${t.name} must omit outputSchema; upstream-passthrough tools cannot reliably guarantee a shape`,
      );
    }
  });

  it("every declared outputSchema has type = object", () => {
    for (const t of tools) {
      const schema = t.definition.outputSchema as
        | { type?: string }
        | undefined;
      if (!schema) continue;
      assert.equal(
        schema.type,
        "object",
        `${t.name} outputSchema must be type: "object" (Cursor/SDK constraint)`,
      );
    }
  });
});
