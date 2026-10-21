-- The per-hackathon backfill in 20261021100000 also gave existing judges
-- invitations to closed hackathons they never judged, so they showed up twice.
-- Remove those: invitations to closed hackathons, created before per-hackathon
-- invitations existed, where the judge has no scores or reviews there.
DELETE FROM public.judge_invitations i
USING public.events e
WHERE i.event_id = e.id
  AND e.status = 'closed'
  AND i.created_at < '2026-10-21'
  AND NOT EXISTS (
    SELECT 1
    FROM public.scores s
    JOIN public.submissions su ON su.id = s.submission_id
    JOIN auth.users u ON u.id = s.judge_id
    WHERE su.event_id = e.id AND lower(u.email) = lower(i.email)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.reviews r
    JOIN public.submissions su ON su.id = r.submission_id
    JOIN auth.users u ON u.id = r.judge_id
    WHERE su.event_id = e.id AND lower(u.email) = lower(i.email)
  );
