import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createErrorResponse,
  createToolResponse,
} from "../src/tools/responses.js";

describe("createToolResponse", () => {
  it("wraps an object with stringified text content and structuredContent", () => {
    const data = { hello: "world", n: 1 };
    const res = createToolResponse(data);

    assert.equal(res.isError, false);
    assert.equal(res.content.length, 1);
    assert.equal(res.content[0].type, "text");
    assert.deepEqual(JSON.parse(res.content[0].text), data);
    assert.deepEqual(res.structuredContent, data);
  });

  it("emits arrays as JSON text but does NOT set structuredContent", () => {
    // The MCP SDK validates structuredContent as a record (object) and rejects
    // bare arrays with -32602 "expected record, received array". The array
    // still rides through content[0].text as JSON.
    const data = [1, 2, 3];
    const res = createToolResponse(data);

    assert.equal(res.isError, false);
    assert.deepEqual(JSON.parse(res.content[0].text), data);
    assert.equal(
      "structuredContent" in res,
      false,
      "bare arrays must not be assigned to structuredContent",
    );
  });

  it("passes a string through verbatim and does NOT set structuredContent", () => {
    const res = createToolResponse("hello");
    assert.equal(res.content[0].text, "hello");
    assert.equal("structuredContent" in res, false);
  });

  it("does NOT set structuredContent for primitives (numbers, booleans, null)", () => {
    for (const v of [42, true, null]) {
      const res = createToolResponse(v);
      assert.equal(
        "structuredContent" in res,
        false,
        `${JSON.stringify(v)} must not become structuredContent`,
      );
      assert.equal(res.content[0].text, JSON.stringify(v, null, 2));
    }
  });

  it("omits structuredContent when data is undefined", () => {
    const res = createToolResponse(undefined);
    assert.equal(res.isError, false);
    assert.equal("structuredContent" in res, false);
  });
});

describe("createErrorResponse", () => {
  it("returns isError=true with the message as text and no structuredContent", () => {
    const res = createErrorResponse("nope");
    assert.equal(res.isError, true);
    assert.equal(res.content[0].type, "text");
    assert.equal(res.content[0].text, "nope");
    assert.equal(
      "structuredContent" in res,
      false,
      "errors must omit structuredContent so the SDK's outputSchema validator does not reject them",
    );
  });
});
