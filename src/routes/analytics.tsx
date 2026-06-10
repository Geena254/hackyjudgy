import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/app-shell";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — EvalDesk" }] }),
  component: () => (
    <AppShell>
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </Card>
    </AppShell>
  ),
});
