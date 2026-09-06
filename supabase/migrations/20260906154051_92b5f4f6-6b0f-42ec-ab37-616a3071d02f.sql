-- Seed a real, running hackathon with rounds, weighted rubric, test team entries and judge scores.
INSERT INTO public.events (id, name, description, starts_on, ends_on, status, created_by)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'EvalDesk Open Hackathon 2026',
  E'Build something useful in ten days. Teams of one to five people ship a working prototype that solves a real problem for a real community — climate, health, education, fintech or civic tech.\n\nEntries are judged by an invited panel against a weighted rubric, and the live standings on this page update as judges score. Bring a working demo, a short write-up and your code.',
  '2026-09-01', '2026-09-20', 'active',
  '2e9d426c-e750-4fff-a890-7ab87d68aac0'
);

INSERT INTO public.rounds (id, event_id, name, phase, deadline, submission_method, sort_order) VALUES
 ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', 'Round 1: Entries open', 'submissions', '2026-09-14', 'Submit your project on this page with a repo link and demo', 1),
 ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', 'Round 2: Panel judging', 'judging', '2026-09-18', 'Blind scoring by the invited judging panel', 2),
 ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', 'Round 3: Finals and results', 'results', '2026-09-20', 'Top five teams demo live, winners announced', 3);

INSERT INTO public.criteria (id, round_id, name, description, weight, max_score, sort_order) VALUES
 ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222202', 'Impact & scale', 'How many people does this help, and how much does it help them?', 35, 5, 1),
 ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222202', 'Originality', 'Is the idea or the approach genuinely new?', 25, 5, 2),
 ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222202', 'Feasibility', 'Does the prototype work, and can the team keep building it?', 25, 5, 3),
 ('33333333-3333-4333-8333-333333333304', '22222222-2222-4222-8222-222222222202', 'User experience', 'Is it clear, usable and well presented?', 15, 5, 4);

INSERT INTO public.submissions (id, event_id, round_id, title, team_name, category, description, submitter_name, submitter_email, repo_url, demo_url, deck_url, status) VALUES
 ('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201',
  'AgriTrack', 'Team Harvest', 'AgriTech',
  'AgriTrack is a mobile-first tool that helps smallholder farmers log what they plant, spray and harvest, then turns that history into simple planting advice for the next season. Built offline-first so it keeps working where the network does not.',
  'Test Team Lead', 'testteam@example.com',
  'https://github.com/example/agritrack', 'https://example.com/agritrack-demo', 'https://example.com/agritrack-deck', 'scored'),
 ('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222201',
  'ClinicQueue', 'Team Pulse', 'HealthTech',
  'ClinicQueue replaces paper waiting lists at small clinics with an SMS-based queue, so patients can wait at home and get a text when they are next. Includes a nurse dashboard that shows the day''s load at a glance.',
  'Test Team Two', 'testteam2@example.com',
  'https://github.com/example/clinicqueue', 'https://example.com/clinicqueue-demo', NULL, 'scored');

INSERT INTO public.scores (submission_id, criterion_id, judge_id, value) VALUES
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333301', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 5),
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333302', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 4),
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333303', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 4),
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333304', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 4),
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333301', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 5),
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333302', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 4),
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333303', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 5),
 ('44444444-4444-4444-8444-444444444401', '33333333-3333-4333-8333-333333333304', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 3),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333301', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 4),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333302', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 3),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333303', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 5),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333304', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 5),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333301', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 3),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333302', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 4),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333303', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 4),
 ('44444444-4444-4444-8444-444444444402', '33333333-3333-4333-8333-333333333304', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 4);

INSERT INTO public.reviews (submission_id, judge_id, feedback, private_notes, completed) VALUES
 ('44444444-4444-4444-8444-444444444401', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 'Strong problem framing and the offline-first choice is exactly right for the users you describe. Tighten the onboarding screens before the finals.', 'Best impact story in the round so far.', true),
 ('44444444-4444-4444-8444-444444444401', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 'Working prototype, clear demo, and a realistic path to keep building. The interface needs more polish.', 'Watch for finals shortlist.', true),
 ('44444444-4444-4444-8444-444444444402', '2e9d426c-e750-4fff-a890-7ab87d68aac0', 'Very usable and the nurse dashboard is a smart addition. Show real clinic numbers to make the impact case land harder.', 'Solid execution, modest ambition.', true),
 ('44444444-4444-4444-8444-444444444402', '4bc8080f-b893-4db0-9a70-ba6523ae04f5', 'SMS-first is a pragmatic decision. Would like to see how you handle patients who miss their turn.', 'Ask about no-show handling.', true);