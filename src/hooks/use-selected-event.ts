import { useSyncExternalStore } from "react";
import type { EventRow } from "@/lib/hackathon";

/** The picked hackathon, else the newest live one, else the newest. */
function pickEvent(events: EventRow[], selectedId: string | undefined) {
  return (
    events.find((e) => e.id === selectedId) ??
    events.find((e) => e.status === "active") ??
    events[0]
  );
}

// The hackathon picked anywhere in the signed-in workspace. Every page shows
// that hackathon, so choosing it once carries across Dashboard, Events,
// Submissions, Judges, Analytics and the judge pages.
const KEY = "gavellab:selected-event";
const listeners = new Set<() => void>();
let current: string | undefined = read();

function read() {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setSelectedEventId(id: string) {
  current = id;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Private mode: the choice still holds for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The selected hackathon among `events` (newest live one until something is picked). */
export function useSelectedEvent(events: EventRow[]) {
  const id = useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  );
  return [pickEvent(events, id), setSelectedEventId] as const;
}
