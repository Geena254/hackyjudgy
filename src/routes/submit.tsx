import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, Button, Pill } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";
import { useActiveEvent, useRounds, useSubmitProject, formatDate } from "@/lib/hackathon";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit Your Project — GavelLab Hackathon Entry" },
      {
        name: "description",
        content:
          "Enter your team's project into the current Power Learn Project hackathon: title, description, repository, demo and pitch deck.",
      },
      { property: "og:title", content: "Submit Your Project — GavelLab" },
      {
        property: "og:description",
        content: "Send your hackathon entry to the judging panel in a couple of minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmitPage,
});

function Field({
  label,
  hint,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        {...rest}
        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SubmitPage() {
  const { data: event, isLoading } = useActiveEvent();
  const { data: rounds = [] } = useRounds(event?.id);
  const submit = useSubmitProject();
  const [doneId, setDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    team_name: "",
    category: "",
    description: "",
    submitter_name: "",
    submitter_email: "",
    repo_url: "",
    demo_url: "",
    deck_url: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!event) return;
    const submissionRound = rounds.find((r) => r.phase === "submissions") ?? rounds[0];
    try {
      const id = await submit.mutateAsync({
        event_id: event.id,
        round_id: submissionRound?.id ?? null,
        ...form,
      });
      setDoneId(id);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <PlpLogo className="h-10" />
          </Link>
          <Link
            to="/auth"
            className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Judge sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        {isLoading && <Card className="p-8 text-sm text-muted-foreground">Loading…</Card>}

        {!isLoading && !event && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-foreground">Submissions are closed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              There is no hackathon open for entries right now. Please check back when the next one
              is announced.
            </p>
          </Card>
        )}

        {!isLoading && event && doneId && (
          <Card className="p-8">
            <CheckCircle2 className="h-10 w-10" style={{ color: "var(--teal)" }} strokeWidth={2} />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Submission received</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks — your project is now with the judging panel for {event.name}. We will be in
              touch by email with the results.
            </p>
            <div className="mt-6 rounded-md border border-border p-4">
              <h2 className="text-sm font-bold text-foreground">Your project page</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Share this link to show what you built — it has your project description and your
                code, demo and pitch deck links.
              </p>
              <p className="mt-3 break-all text-sm font-semibold" style={{ color: "var(--teal)" }}>
                {typeof window !== "undefined"
                  ? `${window.location.origin}/project/${doneId}`
                  : `/project/${doneId}`}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/project/$id"
                params={{ id: doneId }}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--teal)" }}
              >
                View my project page
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Back to home
              </Link>
            </div>
          </Card>
        )}

        {!isLoading && event && !doneId && (
          <>
            <Pill tone="teal" variant="outline">
              Open for entries
            </Pill>
            <h1 className="mt-4 text-3xl font-bold text-foreground">Submit your project</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {event.name} · closes {formatDate(event.ends_on)}
            </p>
            {event.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            )}

            <Card className="mt-6 p-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <Field
                  label="Project title"
                  required
                  value={form.title}
                  onChange={set("title")}
                  placeholder="e.g. AgriTrack"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Team name" value={form.team_name} onChange={set("team_name")} />
                  <Field
                    label="Category"
                    value={form.category}
                    onChange={set("category")}
                    placeholder="e.g. AgriTech"
                  />
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">
                    Project description
                  </span>
                  <textarea
                    required
                    rows={5}
                    value={form.description}
                    onChange={set("description")}
                    placeholder="What problem does it solve, who is it for, and what did you build?"
                    className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-[color:var(--teal)]"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Your name"
                    required
                    value={form.submitter_name}
                    onChange={set("submitter_name")}
                  />
                  <Field
                    label="Your email"
                    type="email"
                    required
                    value={form.submitter_email}
                    onChange={set("submitter_email")}
                  />
                </div>
                <Field
                  label="Code repository link"
                  type="url"
                  value={form.repo_url}
                  onChange={set("repo_url")}
                  placeholder="https://github.com/..."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Demo video or live link"
                    type="url"
                    value={form.demo_url}
                    onChange={set("demo_url")}
                  />
                  <Field
                    label="Pitch deck link"
                    type="url"
                    value={form.deck_url}
                    onChange={set("deck_url")}
                  />
                </div>

                {error && (
                  <p className="text-sm" style={{ color: "var(--magenta)" }}>
                    {error}
                  </p>
                )}

                <Button type="submit" variant="primary" tone="teal" disabled={submit.isPending}>
                  {submit.isPending ? "Sending…" : "Submit project"}
                </Button>
              </form>
            </Card>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
