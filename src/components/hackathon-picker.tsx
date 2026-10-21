import type { EventRow } from "@/lib/hackathon";

/** Switches the hackathon the workspace shows. Hidden with only one hackathon. */
export function HackathonPicker({
  events,
  value,
  onChange,
}: {
  events: EventRow[];
  value: string | undefined;
  onChange: (eventId: string) => void;
}) {
  if (events.length < 2) return null;
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      aria-label="Choose hackathon"
    >
      {events.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
          {e.status === "closed" ? " (closed)" : e.status === "draft" ? " (draft)" : ""}
        </option>
      ))}
    </select>
  );
}
