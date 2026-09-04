import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Ban, BookOpen, Plug, RotateCcw, ShieldCheck } from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/hackathon";
import {
  MCP_ENDPOINT_PATH,
  MCP_ERROR_CODES,
  MCP_RATE_LIMIT_PER_MINUTE,
  MCP_SERVER_NAME,
  MCP_TOOL_DOCS,
} from "@/lib/mcp/docs";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({
    meta: [
      { title: "Agent integrations — EvalDesk" },
      {
        name: "description",
        content:
          "Review connected AI assistants, revoke their access, and read the EvalDesk tool documentation.",
      },
      { property: "og:title", content: "Agent integrations — EvalDesk" },
      {
        property: "og:description",
        content: "Manage assistant connections and EvalDesk tool documentation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IntegrationsPage,
});

type ClientRow = {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string | null;
  user_email: string | null;
  call_count: number;
  first_seen_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(value);
}

function IntegrationsPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const clients = useQuery({
    queryKey: ["mcp-clients"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcp_clients")
        .select(
          "id, user_id, client_id, client_name, user_email, call_count, first_seen_at, last_seen_at, revoked_at",
        )
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientRow[];
    },
  });

  const activity = useQuery({
    queryKey: ["mcp-activity"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mcp_tool_calls")
        .select("id, tool, ok, error_code, client_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const setRevoked = useMutation({
    mutationFn: async (vars: { id: string; revoke: boolean }) => {
      const { error } = await supabase
        .from("mcp_clients")
        .update({ revoked_at: vars.revoke ? new Date().toISOString() : null })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-clients"] });
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Agent integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {MCP_SERVER_NAME} lets AI assistants work with EvalDesk on behalf of a signed-in
            account. Review the assistants people have connected, cut off any you don't recognise,
            and share the tool reference below with whoever is integrating.
          </p>
        </div>

        {!loading && !isAdmin && (
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: "var(--teal)" }}
                strokeWidth={2}
              />
              <p className="text-sm text-muted-foreground">
                Only event admins can review or revoke assistant connections.
              </p>
            </div>
          </Card>
        )}

        {isAdmin && (
          <>
            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Plug className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
                Connected assistants
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each row is one assistant connected to one EvalDesk account. Revoking blocks every
                further request from that assistant until you restore it.
              </p>

              {clients.isLoading && (
                <p className="mt-4 text-sm text-muted-foreground">Loading connections…</p>
              )}
              {clients.isError && (
                <p className="mt-4 text-sm" style={{ color: "var(--magenta)" }}>
                  Could not load connections. Refresh the page to try again.
                </p>
              )}
              {clients.data?.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No assistant has connected yet. Connections appear here the first time an
                  assistant runs an EvalDesk tool.
                </p>
              )}

              <div className="mt-4 space-y-3">
                {(clients.data ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {c.client_name ?? c.client_id}
                        </span>
                        {c.revoked_at ? (
                          <Pill tone="magenta">Revoked</Pill>
                        ) : (
                          <Pill tone="teal">Active</Pill>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.user_email ?? "Account " + c.user_id.slice(0, 8)} · {c.call_count} request
                        {c.call_count === 1 ? "" : "s"} · last used {timeAgo(c.last_seen_at)} ·
                        connected {formatDate(c.first_seen_at)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      tone={c.revoked_at ? "teal" : "magenta"}
                      disabled={setRevoked.isPending}
                      onClick={() => setRevoked.mutate({ id: c.id, revoke: !c.revoked_at })}
                    >
                      {c.revoked_at ? (
                        <>
                          <RotateCcw className="h-4 w-4" strokeWidth={2} /> Restore
                        </>
                      ) : (
                        <>
                          <Ban className="h-4 w-4" strokeWidth={2} /> Revoke
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Activity className="h-5 w-5" style={{ color: "var(--magenta)" }} strokeWidth={2} />
                Recent assistant activity
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The last 30 requests. Each account is limited to {MCP_RATE_LIMIT_PER_MINUTE}{" "}
                requests per minute; anything above that is refused automatically.
              </p>
              {(activity.data ?? []).length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">No requests recorded yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-border">
                  {(activity.data ?? []).map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                      <span className="font-medium text-foreground">{a.tool}</span>
                      {a.ok ? (
                        <Pill tone="teal" variant="outline">
                          ok
                        </Pill>
                      ) : (
                        <Pill tone="magenta" variant="outline">
                          {a.error_code ?? "error"}
                        </Pill>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {a.client_id ?? "unknown"} · {timeAgo(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <BookOpen className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
                Tool reference
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Endpoint <code className="rounded bg-muted px-1">{MCP_ENDPOINT_PATH}</code> on this
                site. Assistants sign in with an EvalDesk account and approve access, then act with
                exactly that account's permissions.
              </p>

              <div className="mt-4 space-y-4">
                {MCP_TOOL_DOCS.map((t) => (
                  <div key={t.name} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-sm font-semibold text-foreground">{t.name}</code>
                      <Pill tone="gray" variant="outline">
                        {t.title}
                      </Pill>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{t.purpose}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Access:</span> {t.auth}
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Inputs:</span>{" "}
                      {t.inputs.length === 0 ? (
                        "none"
                      ) : (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5">
                          {t.inputs.map((i) => (
                            <li key={i.name}>
                              <code>{i.name}</code> ({i.type}
                              {i.required ? ", required" : ", optional"}) — {i.description}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="mt-2 break-words text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Returns:</span>{" "}
                      <code>{t.output}</code>
                    </p>
                  </div>
                ))}
              </div>

              <h3 className="mt-6 text-sm font-semibold text-foreground">Error codes</h3>
              <ul className="mt-2 divide-y divide-border">
                {MCP_ERROR_CODES.map((e) => (
                  <li key={e.code} className="py-2 text-xs text-muted-foreground">
                    <code className="font-semibold text-foreground">{e.code}</code> — {e.meaning}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
