import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — EvalDesk" },
      {
        name: "description",
        content:
          "Track hackathon judging analytics: scoring progress per round, judge activity and weighted rubric results across submissions.",
      },
      { property: "og:title", content: "Judging analytics — EvalDesk" },
      {
        property: "og:description",
        content:
          "See scoring progress, judge activity and weighted rubric results for your hackathon rounds.",
      },
      { property: "og:url", content: "https://hackyjudgy.lovable.app/analytics" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AppShell>
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </Card>
    </AppShell>
  ),
});
