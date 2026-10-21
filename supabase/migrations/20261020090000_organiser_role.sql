-- Organisers are self-serve accounts that run their own hackathons. Kept in its
-- own migration: a new enum value can't be used in the transaction that adds it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'organiser';
