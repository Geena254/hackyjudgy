import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, Pill } from "@/components/app-shell";
import { PlpLogo, SiteFooter } from "@/components/brand";
import { EntryForm } from "@/components/entry-form";
import { useActiveEvent, useRounds, formatDate } from "@/lib/hackathon";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit Your Project - GavelLab Hackathon Entry" },
      {
        name: "description",
        content:
          "Enter your team's project into the current Power Learn Project hackathon: title, description, repository, demo and pitch deck.",
      },
      { property: "og:title", content: "Submit Your Project - GavelLab" },
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

function SubmitPage() {
  const { data: event, isLoading } = useActiveEvent();
  const { data: rounds = [] } = useRounds(event?.id);
  const [doneId, setDoneId] = useState<string | null>(null);

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
              Thanks - your project is now with the judging panel for {event.name}. We will be in
              touch by email with the results.
            </p>
            <div className="mt-6 rounded-md border border-border p-4">
              <h2 className="text-sm font-bold text-foreground">Your project page</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Share this link to show what you built - it has your project description and your
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
              <EntryForm
                event={event}
                rounds={rounds}
                onDone={(id) => {
                  setDoneId(id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </Card>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
