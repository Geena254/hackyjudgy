import { defineTool } from "@lovable.dev/mcp-js";
import { authorize } from "../guard";
import { databaseError, toolSuccess } from "../errors";

export default defineTool({
  name: "list_events",
  title: "List hackathon events",
  description:
    "List the hackathon events visible to the signed-in user, with status and dates. Admins see drafts too.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const gate = await authorize(ctx, "list_events");
    if (!gate.ok) return gate.result;

    const { data, error } = await gate.supabase
      .from("events")
      .select("id, name, description, status, starts_on, ends_on")
      .order("created_at", { ascending: false });
    if (error) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(error, "read the events");
    }

    await gate.finish({ ok: true });
    return toolSuccess({ events: data ?? [] });
  },
});
