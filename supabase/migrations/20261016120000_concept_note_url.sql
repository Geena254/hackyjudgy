-- Separate concept notes from pitch decks so entries can carry both,
-- alongside the live site link (demo_url).
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS concept_note_url text;

-- Inuka Launchpad concept notes were first stored in deck_url; move them over
-- so deck_url is free for the pitch decks.
UPDATE public.submissions s
SET concept_note_url = s.deck_url,
    deck_url = NULL
FROM public.events e
WHERE e.id = s.event_id
  AND e.name = 'Inuka Launchpad Demo'
  AND s.concept_note_url IS NULL
  AND s.deck_url LIKE 'https://docs.google.com/document/%';
