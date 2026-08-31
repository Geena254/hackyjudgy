import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/judges")({
  head: () => ({ meta: [{ title: "Judges — EvalDesk" }] }),
  component: () => (
    <AppShell>
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Judges</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your judge panel from the Event Setup page.
        </p>
      </Card>
    </AppShell>
  ),
});
