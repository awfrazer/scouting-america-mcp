export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: unknown;
  isError: boolean;
}

export function createToolResponse(data: unknown): ToolResponse {
  const text =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const response: ToolResponse = {
    content: [{ type: "text", text }],
    isError: false,
  };
  // Only attach `structuredContent` when the payload is a plain object. The
  // MCP SDK (and Cursor) validate `structuredContent` against zod's `record`
  // schema and reject bare arrays/strings/numbers with -32602 "expected
  // record, received array". The JSON in `content[0].text` is the canonical
  // copy for the model; `structuredContent` is just an optional convenience
  // for clients that want a parsed object back.
  if (isPlainObject(data)) {
    response.structuredContent = data;
  }
  return response;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

export function createErrorResponse(message: string): ToolResponse {
  // Intentionally no structuredContent on errors so the SDK's outputSchema
  // validator (which expects the success shape) doesn't reject the error.
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
