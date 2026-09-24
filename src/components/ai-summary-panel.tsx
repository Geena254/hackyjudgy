import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { Card, Button } from "@/components/app-shell";
import { summarizeSubmission, type EvaluationSummary } from "@/lib/ai-summary.functions";

type Crit = { name: string; description: string | null; weight: number };

export function AiSummaryPanel({
  title,
  defaultText,
  criteria,
}: {
  title: string;
  defaultText: string;
  criteria: Crit[];
}) {
  const run = useServerFn(summarizeSubmission);
  const [text, setText] = useState(defaultText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await run({
        data: { title, text, criteria: criteria.map((c) => ({ ...c, weight: Number(c.weight) || 0 })) },
      });
      if (res.ok) setSummary(res.summary);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4" style={{ color: "var(--magenta)" }} strokeWidth={2} />
        <h3 className="text-lg font-bold" style={{ color: "var(--teal)" }}>
          AI evaluation summary
        </h3>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Paste the submission write-up, README or pitch text. The summary is a reading aid only — your scores stay yours.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Paste submission text here..."
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--teal)]"
      />
      <div className="mt-3 flex items-center gap-3">
        <Button variant="primary" tone="teal" onClick={generate} disabled={loading || text.trim().length < 20}>
          {loading ? "Summarising..." : summary ? "Regenerate summary" : "Generate summary"}
        </Button>
        {text.trim().length < 20 && (
          <span className="text-xs text-muted-foreground">Add at least a few sentences.</span>
        )}
      </div>
      {error && (
        <div className="mt-3 rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--magenta)", color: "var(--magenta)" }}>
          {error}
        </div>
      )}
      {summary && (
        <div className="mt-5 space-y-4 text-sm">
          <p className="leading-relaxed text-foreground">{summary.overview}</p>
          <Section label="Strengths" items={summary.strengths} />
          <Section label="Concerns" items={summary.concerns} />
          {summary.criteria_notes.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By criterion</div>
              <ul className="space-y-1">
                {summary.criteria_notes.map((c, i) => (
                  <li key={i}>
                    <span className="font-semibold text-foreground">{c.criterion}:</span>{" "}
                    <span className="text-muted-foreground">{c.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Section label="Questions for the team" items={summary.questions_for_team} />
        </div>
      )}
    </Card>
  );
}

function Section({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
