import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — EvalDesk" }] }),
  component: () => (
    <AppShell>
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </Card>
    </AppShell>
  ),
});
