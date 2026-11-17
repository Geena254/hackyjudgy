import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Mail, Send } from "lucide-react";
import logoUrl from "@/assets/plp-logo.png";
import { Button, Card } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  AI_JUDGE,
  criteriaForSubmission,
  formatDateTime,
  type CriterionRow,
  type EventRow,
  type ReviewRow,
  type RoundRow,
  type ScoreRow,
  type SubmissionRow,
} from "@/lib/hackathon";
import type { RankedStanding } from "@/lib/results";
import { judgePanel, type ReportJudge } from "@/lib/team-report";

export type ResultEmailLog = {
  submission_id: string;
  recipients: string[];
  failures: string[];
  sent_at: string;
};

/** Latest results email per entry, for the organiser's view of who was sent what. */
export function useResultEmails(eventId: string | undefined) {
  return useQuery({
    queryKey: ["result-emails", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("result_emails")
        .select("submission_id, recipients, failures, sent_at")
        .eq("event_id", eventId!)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      const latest = new Map<string, ResultEmailLog>();
      for (const row of (data ?? []) as ResultEmailLog[]) {
        if (!latest.has(row.submission_id)) latest.set(row.submission_id, row);
      }
      return latest;
    },
  });
}

/** Everyone an entry's results go to (same rule as the server). */
export function entryEmails(
  sub: Pick<SubmissionRow, "submitter_email" | "team_member_emails"> | undefined,
) {
  if (!sub) return [];
  const all = [sub.submitter_email, ...(sub.team_member_emails ?? [])]
    .map((e) => (e ?? "").trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return [...new Set(all)];
}

let logoBytes: Promise<ArrayBuffer | undefined> | undefined;
const loadLogo = () =>
  (logoBytes ??= fetch(logoUrl)
    .then((r) => (r.ok ? r.arrayBuffer() : undefined))
    .catch(() => undefined));

function toBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

type Options = { showRank: boolean; showNames: boolean };

type Line = { title: string; ok: boolean; text: string };

/** Email each team its results report: preview, send one, or send every team not yet emailed. */
export function EmailResultsPanel({
  event,
  rounds,
  criteria,
  rubric,
  subs,
  standings,
  judges,
  scores,
  reviews,
}: {
  event: EventRow;
  rounds: RoundRow[];
  criteria: CriterionRow[];
  rubric: CriterionRow[];
  subs: SubmissionRow[];
  standings: RankedStanding[];
  judges: ReportJudge[];
  scores: ScoreRow[];
  reviews: ReviewRow[];
}) {
  const qc = useQueryClient();
  const { data: sent = new Map<string, ResultEmailLog>() } = useResultEmails(event.id);
  const [options, setOptions] = useState<Options>({ showRank: true, showNames: false });
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<Line[]>([]);

  // Same judge numbering as the printable team reports: panel by name, AI judge last.
  const ordered = useMemo(
    () => [
      ...judges.filter((j) => j.id !== AI_JUDGE.id).sort((a, b) => a.name.localeCompare(b.name)),
      ...judges.filter((j) => j.id === AI_JUDGE.id),
    ],
    [judges],
  );
  const subById = useMemo(() => new Map(subs.map((s) => [s.id, s])), [subs]);
  const teamId = picked || standings[0]?.submission.id || "";

  const scored = standings.filter((s) => s.weightedTotal !== null);
  const unsent = scored.filter(
    (s) => !sent.has(s.submission.id) && entryEmails(subById.get(s.submission.id)).length > 0,
  );
  const noEmail = scored.filter(
    (s) => entryEmails(subById.get(s.submission.id)).length === 0,
  ).length;
  const unscored = standings.length - scored.length;

  async function buildPdf(submissionId: string) {
    const st = standings.find((s) => s.submission.id === submissionId);
    if (!st) throw new Error("Team not found.");
    const { buildResultsPdf } = await import("@/lib/results-pdf");
    return {
      st,
      pdf: await buildResultsPdf({
        eventName: event.name,
        standing: st,
        total: standings.length,
        rubric,
        panel: judgePanel({
          submissionId,
          criteria: criteriaForSubmission(st.submission, rounds, criteria),
          judges: ordered,
          scores,
          reviews,
          showNames: options.showNames,
        }),
        showRank: options.showRank,
        logo: await loadLogo(),
      }),
    };
  }

  async function preview() {
    setBusy("Building the PDF…");
    try {
      const { pdf } = await buildPdf(teamId);
      const url = URL.createObjectURL(new Blob([pdf as BlobPart], { type: "application/pdf" }));
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setLog([{ title: "Preview", ok: false, text: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setBusy(null);
    }
  }

  async function sendOne(submissionId: string): Promise<Line> {
    const title =
      standings.find((s) => s.submission.id === submissionId)?.submission.title ?? "Team";
    try {
      const { pdf } = await buildPdf(submissionId);
      const { sendTeamResults } = await import("@/lib/result-emails.functions");
      const out = await sendTeamResults({ data: { submissionId, pdfBase64: toBase64(pdf) } });
      const failed = out.failures.length ? ` · not delivered: ${out.failures.join("; ")}` : "";
      return {
        title,
        ok: out.failures.length === 0,
        text: `Sent to ${out.recipients.join(", ")}${failed}`,
      };
    } catch (e) {
      return { title, ok: false, text: e instanceof Error ? e.message : String(e) };
    }
  }

  async function sendPicked() {
    const sub = subById.get(teamId);
    const to = entryEmails(sub);
    if (to.length === 0) {
      setLog([
        {
          title: sub?.title ?? "Team",
          ok: false,
          text: "This entry has no email address to send to.",
        },
      ]);
      return;
    }
    const again = sent.has(teamId) ? " They were already emailed once; this sends a new copy." : "";
    if (!window.confirm(`Email the results for "${sub?.title}" to ${to.join(", ")}?${again}`))
      return;
    setBusy("Sending…");
    const line = await sendOne(teamId);
    setLog([line]);
    await qc.invalidateQueries({ queryKey: ["result-emails", event.id] });
    setBusy(null);
  }

  async function sendAll() {
    if (unsent.length === 0) return;
    const people = unsent.reduce((n, s) => n + entryEmails(subById.get(s.submission.id)).length, 0);
    if (
      !window.confirm(
        `Email results to ${unsent.length} team${unsent.length === 1 ? "" : "s"} (${people} email${people === 1 ? "" : "s"})? Each team gets only its own report.`,
      )
    )
      return;
    const lines: Line[] = [];
    setLog(lines);
    for (const [i, st] of unsent.entries()) {
      setBusy(`Sending ${i + 1} of ${unsent.length}: ${st.submission.title}`);
      lines.push(await sendOne(st.submission.id));
      setLog([...lines]);
    }
    await qc.invalidateQueries({ queryKey: ["result-emails", event.id] });
    setBusy(null);
  }

  const pickedLog = sent.get(teamId);

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Mail className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
        Email results to teams
      </h2>
      <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
        Each team gets an email with its own results report attached as a PDF, plus a link to
        download it. It goes to the submitter and the team member emails on the entry. Private judge
        notes are never included.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={options.showRank}
            onChange={(e) => setOptions({ ...options, showRank: e.target.checked })}
          />
          Show final position
        </label>
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={options.showNames}
            onChange={(e) => setOptions({ ...options, showNames: e.target.checked })}
          />
          Show judge names
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={teamId}
          onChange={(e) => setPicked(e.target.value)}
          className="min-w-0 max-w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          aria-label="Team"
        >
          {standings.map((s) => (
            <option key={s.submission.id} value={s.submission.id}>
              {s.submission.title}
              {sent.has(s.submission.id) ? " (emailed)" : ""}
            </option>
          ))}
        </select>
        <Button variant="outline" tone="teal" onClick={preview} disabled={!teamId || !!busy}>
          <Eye className="h-4 w-4" strokeWidth={2} /> Preview PDF
        </Button>
        <Button variant="primary" tone="teal" onClick={sendPicked} disabled={!teamId || !!busy}>
          <Send className="h-4 w-4" strokeWidth={2} /> Send to this team
        </Button>
      </div>
      {teamId && (
        <p className="mt-2 text-xs text-muted-foreground">
          {pickedLog
            ? `Emailed ${formatDateTime(pickedLog.sent_at)} to ${pickedLog.recipients.join(", ")}`
            : entryEmails(subById.get(teamId)).length
              ? `Will go to ${entryEmails(subById.get(teamId)).join(", ")}`
              : "This entry has no email address."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button
          variant="primary"
          tone="teal"
          onClick={sendAll}
          disabled={unsent.length === 0 || !!busy}
        >
          <Mail className="h-4 w-4" strokeWidth={2} /> Email every team not yet emailed (
          {unsent.length})
        </Button>
        <span className="text-xs text-muted-foreground">
          {[
            sent.size > 0 && `${sent.size} already emailed`,
            unscored > 0 && `${unscored} with no scores yet are skipped`,
            noEmail > 0 && `${noEmail} with no email address`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      {busy && (
        <p className="mt-3 text-sm text-foreground" role="status">
          {busy}
        </p>
      )}
      {log.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {log.map((l, i) => (
            <li key={i} className={l.ok ? "text-foreground" : "text-destructive"}>
              <strong>{l.title}:</strong> {l.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
