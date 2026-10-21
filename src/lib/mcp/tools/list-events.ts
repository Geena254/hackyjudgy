import { defineTool } from "@lovable.dev/mcp-js";
import { authorize } from "../guard";
import { databaseError, toolSuccess } from "../errors";

export default defineTool({
  name: "list_events",
  title: "List hackathon events",
  description:
    "List the hackathon events the signed-in user works on, with status and dates: every event for platform admins, their own events for organisers, and the events they judge for judges.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const gate = await authorize(ctx, "list_events");
    if (!gate.ok) return gate.result;

    const { data, error } = await gate.supabase
      .rpc("workspace_events")
      .select("id, name, description, status, starts_on, ends_on");
    if (error) {
      await gate.finish({ ok: false, code: "DATABASE_ERROR" });
      return databaseError(error, "read the events");
    }

    await gate.finish({ ok: true });
    return toolSuccess({ events: data ?? [] });
  },
});
