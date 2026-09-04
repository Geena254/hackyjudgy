import { createFileRoute } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EvalDesk" },
      {
        name: "description",
        content:
          "Manage your EvalDesk account, hackathon preferences and judging panel settings in one place.",
      },
      { property: "og:title", content: "Account & event settings — EvalDesk" },
      {
        property: "og:description",
        content:
          "Manage your account details, hackathon preferences and judging panel settings.",
      },
      { property: "og:url", content: "https://hackyjudgy.lovable.app/settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AppShell>
      <Card className="p-8 text-center">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Coming soon.</p>
      </Card>
    </AppShell>
  ),
});
