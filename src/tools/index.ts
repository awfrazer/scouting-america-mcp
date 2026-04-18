// Importing each tool module triggers its registerTool(...) side effects.
// Order doesn't matter; the registry sorts alphabetically when listing.
import "./account.js";
import "./catalog.js";
import "./requirements.js";
import "./lookups.js";
import "./person.js";
import "./youth.js";
import "./events.js";
import "./org.js";
import "./passthrough.js";

export { attachHandlers, listRegisteredTools } from "./toolRegistry.js";
