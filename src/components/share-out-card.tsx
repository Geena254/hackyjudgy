import { useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import { Button, Card } from "@/components/app-shell";
import {
  useAssignments,
  useJudges,
  useShareOut,
  useSubmissions,
  useUndoShareOut,
  SHARE_OUT_THRESHOLD,
  type EventRow,
} from "@/lib/hackathon";

/** Share a big hackathon's entries out evenly so no judge has to score them all. */
export function ShareOutCard({ event }: { event: EventRow }) {
  const { data: subs = [] } = useSubmissions(event.id);
  const { data: judges = [] } = useJudges(event.id);
  const { data: assignments = [] } = useAssignments(event.id);
  const shareOut = useShareOut();
  const undo = useUndoShareOut();
  const [message, setMessage] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const live = subs.filter((s) => s.status !== "disqualified");
  const entries = live.length;
  const sharedOut = assignments.length > 0;
  const eligible = entries > SHARE_OUT_THRESHOLD;
  const each = judges.length ? Math.ceil(entries / judges.length) : 0;
  const assigned = new Set(assignments.map((a) => a.submission_id));
  const waiting = sharedOut ? live.filter((s) => !assigned.has(s.id)).length : 0;

  function run(action: typeof shareOut, done: (n: number | null) => string) {
    action.mutate(event.id, {
      onSuccess: (n) => {
        setProblem(null);
        setMessage(done(n));
      },
      onError: (e) => {
        setMessage(null);
        setProblem(e instanceof Error ? e.message : "Something went wrong.");
      },
    });
  }

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Shuffle className="h-5 w-5" style={{ color: "var(--teal)" }} strokeWidth={2} />
        Share out entries
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        {sharedOut
          ? "Entries are shared out. Each entry goes to one judge, and each judge only sees and scores their own share. New entries go to the judge with the fewest. Results use the score from the judge each entry was given to."
          : eligible
            ? `With ${entries} entries, you can share them out so each judge scores about ${each} instead of all ${entries}. Each entry is then scored by one judge.`
            : `With ${entries} entries (${SHARE_OUT_THRESHOLD} or fewer), every judge scores every entry. Once there are more than ${SHARE_OUT_THRESHOLD}, you can share them out between judges.`}
      </p>
      {waiting > 0 && (
        <p className="mt-2 text-sm" style={{ color: "var(--magenta)" }}>
          {waiting} {waiting === 1 ? "entry has" : "entries have"} no judge yet. Rebalance to give{" "}
          {waiting === 1 ? "it" : "them"} one.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          tone="teal"
          disabled={!eligible || judges.length === 0 || shareOut.isPending}
          onClick={() =>
            run(shareOut, (n) =>
              sharedOut
                ? `Rebalanced. ${n ?? 0} entries nobody had started were shared out again evenly.`
                : `Shared out ${n ?? 0} entries between ${judges.length} judges.`,
            )
          }
        >
          {shareOut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {sharedOut ? "Rebalance shares" : `Share out between ${judges.length} judges`}
        </Button>
        {sharedOut && (
          <Button
            variant="outline"
            tone="teal"
            disabled={undo.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Undo sharing out? Every judge will see and score every entry again. Scores already given are kept.",
                )
              )
                run(undo, () => "Sharing out undone. Every judge now scores every entry.");
            }}
          >
            Undo sharing out
          </Button>
        )}
      </div>
      {eligible && judges.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Invite judges to this hackathon first.</p>
      )}
      {message && (
        <p className="mt-3 text-sm font-medium" style={{ color: "var(--teal)" }}>
          {message}
        </p>
      )}
      {problem && <p className="mt-3 text-sm font-medium text-destructive">{problem}</p>}
    </Card>
  );
}
