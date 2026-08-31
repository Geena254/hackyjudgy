import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { AppShell, Card, Button, Pill } from "@/components/app-shell";
import { inviteJudge, listInvitations } from "@/lib/judges.functions";
import { judges } from "@/lib/eval-data";
import { useAuth, initials } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/judges")({
  head: () => ({
    meta: [
      { title: "Judges — EvalDesk" },
      {
        name: "description",
        content: "Invite judges by email and track who has joined your judging panel.",
      },
      { property: "og:title", content: "Judges — EvalDesk" },
      { property: "og:description", content: "Manage your hackathon judging panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JudgesPage,
});

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

function statusTone(status: string) {
  return status === "accepted" ? ("teal" as const) : ("gray" as const);
}

function JudgesPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const invite = useServerFn(inviteJudge);
  const list = useServerFn(listInvitations);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [expertise, setExpertise] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invitations = useQuery({
    queryKey: ["judge-invitations"],
    queryFn: () => list(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: (vars: { email: string; fullName?: string; expertise?: string }) =>
      invite({ data: { ...vars, appOrigin: window.location.origin } }),
    onSuccess: (res) => {
      setNotice(res.message);
      setError(null);
      setEmail("");
      setName("");
      setExpertise("");
      queryClient.invalidateQueries({ queryKey: ["judge-invitations"] });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Could not send the invitation.");
      setNotice(null);
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Judges</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite judges by email. Each invited judge receives a link to create their EvalDesk
            account and is added to the panel automatically.
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
                Only event admins can invite judges. You're signed in as a judge — head to
                Submissions to start scoring.
              </p>
            </div>
          </Card>
        )}

        {isAdmin && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <UserPlus className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
                Invite a judge
              </h2>
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate({
                    email: email.trim(),
                    fullName: name.trim() || undefined,
                    expertise: expertise.trim() || undefined,
                  });
                }}
              >
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="judge@example.com"
                  maxLength={255}
                  required
                />
                <Input
                  label="Full name (optional)"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Mitchell"
                  maxLength={120}
                />
                <Input
                  label="Expertise (optional)"
                  type="text"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="AI/ML"
                  maxLength={120}
                />
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                {notice && (
                  <p className="text-sm font-medium" style={{ color: "var(--teal)" }}>
                    {notice}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" strokeWidth={2} />
                  )}
                  Send invitation
                </Button>
              </form>
            </Card>

            <Card className="p-5 lg:col-span-2">
              <h2 className="text-lg font-semibold text-foreground">Invitations</h2>
              {invitations.isLoading && (
                <p className="mt-4 text-sm text-muted-foreground">Loading invitations…</p>
              )}
              {invitations.data?.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No invitations yet. Invite your first judge using the form.
                </p>
              )}
              <ul className="mt-4 divide-y divide-border">
                {(invitations.data ?? []).map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                      style={{ background: "var(--teal)" }}
                    >
                      {initials(inv.full_name ?? inv.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {inv.full_name ?? inv.email}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {inv.email}
                        {inv.expertise ? ` · ${inv.expertise}` : ""}
                      </div>
                    </div>
                    <Pill tone={statusTone(inv.status)} variant="outline">
                      {inv.status === "accepted" ? "Joined" : "Pending"}
                    </Pill>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-foreground">Panel activity</h2>
          <ul className="mt-4 divide-y divide-border">
            {judges.map((j) => (
              <li key={j.name} className="flex flex-wrap items-center gap-3 py-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: "var(--magenta)" }}
                >
                  {initials(j.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{j.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {j.scored} scored · {j.pending} pending
                  </div>
                </div>
                <Pill tone="teal" variant="outline">
                  {j.scored}
                </Pill>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
