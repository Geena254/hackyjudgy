import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";
import {
  databaseError,
  rateLimitError,
  revokedError,
  unauthenticatedError,
  type McpErrorCode,
  type McpToolError,
} from "./errors";

/** Maximum tool calls a single GavelLab account may make per rolling minute. */
export const RATE_LIMIT_PER_MINUTE = 40;

type Supabase = ReturnType<typeof supabaseForUser>;

type Granted = {
  ok: true;
  supabase: Supabase;
  userId: string;
  clientId: string;
  /** Records the outcome of this call for the activity log. */
  finish: (outcome: { ok: boolean; code?: McpErrorCode }) => Promise<void>;
};

type Denied = { ok: false; result: McpToolError };

/**
 * Shared entry point for every tool: verifies the OAuth identity, honours
 * admin revocations, applies rate limiting, and records assistant activity.
 */
export async function authorize(ctx: ToolContext, tool: string): Promise<Granted | Denied> {
  if (!ctx.isAuthenticated()) return { ok: false, result: unauthenticatedError() };
  const userId = ctx.getUserId();
  if (!userId) return { ok: false, result: unauthenticatedError() };

  let supabase: Supabase;
  try {
    supabase = supabaseForUser(ctx);
  } catch {
    return { ok: false, result: unauthenticatedError() };
  }

  const clientId = ctx.getClientId() ?? "unknown-client";

  const log = async (ok: boolean, code?: McpErrorCode) => {
    await supabase
      .from("mcp_tool_calls")
      .insert({ user_id: userId, client_id: clientId, tool, ok, error_code: code ?? null });
  };

  const { data: client, error: clientError } = await supabase
    .from("mcp_clients")
    .select("id, revoked_at, call_count")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (clientError) return { ok: false, result: databaseError(clientError, "check this connection") };

  if (client?.revoked_at) {
    await log(false, "ACCESS_REVOKED");
    return { ok: false, result: revokedError() };
  }

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("mcp_tool_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    await log(false, "RATE_LIMITED");
    return { ok: false, result: rateLimitError(RATE_LIMIT_PER_MINUTE) };
  }

  const now = new Date().toISOString();
  await supabase.from("mcp_clients").upsert(
    {
      user_id: userId,
      client_id: clientId,
      client_name: clientId,
      user_email: ctx.getUserEmail() ?? null,
      call_count: (client?.call_count ?? 0) + 1,
      last_seen_at: now,
    },
    { onConflict: "user_id,client_id" },
  );

  return {
    ok: true,
    supabase,
    userId,
    clientId,
    finish: async ({ ok, code }) => {
      await log(ok, code);
    },
  };
}
