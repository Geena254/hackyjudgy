import { useState } from "react";
import { User, Users } from "lucide-react";
import { Button } from "@/components/app-shell";
import { useSubmitProject, type EventRow, type RoundRow } from "@/lib/hackathon";

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

const EMPTY = {
  title: "",
  team_name: "",
  category: "",
  description: "",
  submitter_name: "",
  submitter_email: "",
  video_url: "",
  deck_url: "",
  demo_url: "",
  repo_url: "",
};

/** Public hackathon entry form. Entrants choose to enter as a team or on their own. */
export function EntryForm({
  event,
  rounds,
  onDone,
}: {
  event: EventRow;
  rounds: RoundRow[];
  onDone: (submissionId: string) => void;
}) {
  const submit = useSubmitProject();
  const [entryAs, setEntryAs] = useState<"team" | "individual">("team");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const submissionRound = rounds.find((r) => r.phase === "submissions") ?? rounds[0];
    try {
      const id = await submit.mutateAsync({
        event_id: event.id,
        round_id: submissionRound?.id ?? null,
        ...form,
        // Solo entrants have no team; standings show them as an independent entry.
        team_name: entryAs === "team" ? form.team_name : "",
      });
      setForm(EMPTY);
      onDone(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-foreground">Entering as</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: "team", label: "A team", hint: "You're entering with others", icon: Users },
              {
                value: "individual",
                label: "Just me",
                hint: "You're entering on your own",
                icon: User,
              },
            ] as const
          ).map((o) => {
            const selected = entryAs === o.value;
            return (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3"
                style={{
                  borderColor: selected ? "var(--teal)" : "var(--border)",
                  boxShadow: selected ? "inset 0 0 0 1px var(--teal)" : undefined,
                }}
              >
                <input
                  type="radio"
                  name="entry-as"
                  value={o.value}
                  checked={selected}
                  onChange={() => setEntryAs(o.value)}
                  className="sr-only"
                />
                <o.icon
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: selected ? "var(--teal)" : undefined }}
                  strokeWidth={2}
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Project title"
        required
        value={form.title}
        onChange={set("title")}
        placeholder="e.g. AgriTrack"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {entryAs === "team" && (
          <Field label="Team name" required value={form.team_name} onChange={set("team_name")} />
        )}
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
          label={entryAs === "team" ? "Team lead's name" : "Your name"}
          required
          value={form.submitter_name}
          onChange={set("submitter_name")}
        />
        <Field
          label={entryAs === "team" ? "Team lead's email" : "Your email"}
          type="email"
          required
          value={form.submitter_email}
          onChange={set("submitter_email")}
          hint="Only the organisers and judges can see this."
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Project links</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          All four links are required. Make sure each one is public or shared so judges can open it.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Video demo link"
          type="url"
          required
          value={form.video_url}
          onChange={set("video_url")}
          placeholder="https://youtu.be/..."
        />
        <Field
          label="Pitch deck link"
          type="url"
          required
          value={form.deck_url}
          onChange={set("deck_url")}
          placeholder="https://canva.com/..."
        />
        <Field
          label="Live prototype link"
          type="url"
          required
          value={form.demo_url}
          onChange={set("demo_url")}
          placeholder="https://your-app.lovable.app"
        />
        <Field
          label="GitHub repository link"
          type="url"
          required
          value={form.repo_url}
          onChange={set("repo_url")}
          placeholder="https://github.com/..."
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
  );
}
