import { getCurrentUserId } from "../session.js";

/**
 * Resolve the `userId` for a tool call.
 *
 * - Field omitted entirely -> default to the authenticated user.
 * - Field provided but empty / whitespace / the literal "null"/"undefined"
 *   -> throw a clear local error rather than building a malformed path
 *   (e.g. `/persons//myScout`) or silently querying the wrong subject.
 * - Otherwise -> the trimmed string value.
 *
 * Shared by every tool that defaults `userId` so the "empty userId" contract
 * is identical across the youth / person / events families.
 */
export async function resolveUserId(
  args: Record<string, unknown>,
): Promise<string> {
  if (!("userId" in args) || args.userId === undefined) {
    return getCurrentUserId();
  }
  const value = String(args.userId).trim();
  if (value === "" || value === "null" || value === "undefined") {
    throw new Error(
      "userId was provided but empty; omit it to default to the authenticated user.",
    );
  }
  return value;
}
