# GavelLab

GavelLab is a hackathon judging and scoring platform built for Power Learn Project (PLP). Organisers use it to run a hackathon from start to finish: publish the event, collect entries, invite judges, score entries against a weighted rubric and announce the results.

The app is deployed at <https://judging.powerlearnprojectafrica.org>.

## Who uses it

| Audience | What they do | Where |
| --- | --- | --- |
| **Participants and the public** | Browse every live hackathon, read the brief and rubric, enter a project and follow the live standings | `/hackathon`, `/submit`, `/project/:id` |
| **Organisers** | Sign up with their email and run their own hackathons: create events, rounds and rubrics, manage entries, invite judges, track progress and publish results. They only ever see their own hackathons. | `/dashboard`, `/events`, `/submissions`, `/judges`, `/analytics`, `/integrations`, `/settings` |
| **Platform admin (PLP)** | Uses the same workspace, but sees and manages every hackathon on the platform, whoever organised it | Same pages as organisers |
| **Judges** | Work through their own scoring queue, score each criterion, leave feedback and see the results | `/judge`, `/scoring`, `/results` |
| **Prospective organisers** | Learn what the platform does and sign up | `/for-organisers`, `/how-to-organize-a-hackathon` |

## Features

- **Public hackathon listings.** `/hackathon` lists every published hackathon on the platform. Selecting one (`/hackathon?event=<id>`) shows its brief, rounds, rubric, live standings and entry form.
- **Rounds.** Each event can have submission, judging and results rounds, each with its own deadline and submission method.
- **Weighted rubric.** Each criterion has its own weight and maximum score. Projects are ranked on a weighted total, and the standings show how many points each criterion contributed.
- **Organiser workspaces.** Anyone can sign up as an organiser and becomes the admin of their own workspace. Organisers only see their own hackathons, entries, judges and scores. The platform admin sees everything.
- **Judge invitations.** Organisers invite judges by email, and Supabase Auth sends the invitation. A judge only scores the hackathons of the organiser who invited them, and the same person can judge for several organisers.
- **Live standings.** The public board shows averaged scores only. Individual judges' marks and submitters' contact details are never public. Each hackathon has a **Show live rankings to the public** setting. When it's off, no scores reach the public until the organiser announces results.
- **Team or solo entries.** Participants choose whether they're entering as a team or on their own. Every entry includes a video demo, pitch deck, live prototype and GitHub link.
- **Blind judging.** Judges can hide team names while they score. It's on by default.
- **AI evaluation summaries.** Judges can generate a structured summary of a submission covering strengths, concerns, per-criterion notes and questions for the team.
- **Results and reports.** Organisers get a full results view and a printable report for each team, which can be saved as a PDF.
- **MCP server.** AI assistants can list events, read rubrics, list submissions, record scores and export results through an MCP endpoint, using the signed-in user's permissions (see [`src/lib/mcp/`](src/lib/mcp/)).

## Project structure

```
src/
  routes/                  File-based routes (see src/routes/README.md)
    hackathon.tsx          Public listing of all hackathons, plus standings and the entry form
    for-organisers.tsx     Marketing page for organisers (uses its own colour theme)
    _authenticated/        Signed-in admin and judge pages
    mcp.ts                 MCP endpoint
  components/
    app-shell.tsx          Signed-in layout, navigation and shared Card, Pill and Button components
    brand.tsx              PLP logo and site footer
    ui/                    shadcn/ui components
  lib/
    hackathon.ts           Data hooks (events, rounds, criteria, submissions, scores) and standings maths
    results.ts             Results aggregation
    judges.functions.ts    Server functions for inviting and revoking judges
    ai-summary.functions.ts  Server function for AI evaluation summaries
    mcp/                   MCP server definition and tools
  integrations/supabase/   Supabase clients and auth middleware
supabase/migrations/       Database schema, RLS policies and public RPCs
scripts/                   Seed and email test scripts
```

## Data model

- **events** have a `status` of `draft`, `active` or `closed`. Only `active` events are publicly visible. `created_by` is the organiser who owns the event.
- **rounds** belong to an event and have a phase: `submissions`, `judging` or `results`.
- **criteria** belong to a round and have a weight and a maximum score.
- **submissions** are entries to an event. Anyone can create one for an active event.
- **scores** and **reviews** are an individual judge's marks and feedback on a submission.
- **judge_invitations** record which organiser invited which judge. This decides which hackathons a judge can score.
- **user_roles** hold each user's role:
  - `admin` is the platform owner. The first account ever created gets this role.
  - `organiser` is given to anyone who signs up without an invitation.
  - `judge` is given to anyone who signs up with an invitation.

Row-level security enforces the separation between organisers. Organisers can only read and change their own events (`events.created_by`) and everything under them. Judges can only read the submissions of the organisers who invited them. Signed-in pages load hackathons through the `workspace_events()` RPC rather than reading the events table directly, because every live event on the platform is publicly readable. Progress figures use `event_judges(event_id)` so they only count that hackathon's panel.

Public pages read submissions and scores through the RPCs `public_submissions`, `public_submission` and `public_score_averages`, so contact details and individual judges' marks stay private.

## Getting started

### For organisers

1. **Create your organiser account.** On `/for-organisers`, choose **Start free**, then sign up with your name, email and a password. Confirm your email if asked. You are now the admin of your own workspace, and signing in takes you to your **Dashboard**. Your workspace only shows hackathons you created, and no other organiser can see them.
2. **Create your hackathon.** Open **Events** and fill in the hackathon name, description and start and end dates, then choose **Create hackathon**. It starts as a draft, which only you and the platform admin can see.
3. **Add rounds.** Still on **Events**, add a round for each stage, such as submissions, judging and results. Give each round a phase and a deadline, and optionally a submission method, for example "GitHub link and a 3-minute demo video".
4. **Build the rubric.** For each round, add the criteria judges will score. Each criterion needs a name, guidance for judges, a weight (%) and a maximum score. Check the **Rubric overview** to make sure the weights add up the way you intend.
5. **Publish.** Choose **Publish**, or set the status to *Published (open for entries)*. The hackathon then appears on the public `/hackathon` page and starts accepting entries. You can share its direct link, `/hackathon?event=<id>`.
6. **Invite judges.** On **Judges**, enter each judge's email address and, optionally, their name and area of expertise. Each judge receives an email invitation. Your judges can only score your hackathons. The **Invitations** list shows who has accepted, and you can revoke invitations from there. Revoking only removes the judge from your hackathons; if another organiser also invited them, they keep judging for that organiser.
7. **Manage entries.** **Submissions** lists every entry. You can add an entry for a team yourself, correct its details and links, assign it to a round, or change its status, for example to disqualify it.
8. **Track judging.** If you run more than one hackathon, use the drop-down on the hackathon name at the top of the **Dashboard** to switch between them. The **Dashboard** shows entry status, the latest entries and each judge's progress. **Analytics** shows progress by round, judge activity and the weighted standings, so you can see which judges still have scoring to do before the deadline.
9. **Announce results.** Use the results view to review final scores and ranks. Each team has a printable report that you can save as a PDF and send to them. When judging is over, set the hackathon's status to **Closed**.

### For participants

You don't need an account to take part.

1. **Find a hackathon.** Go to `/hackathon` to see every hackathon that's open on the platform. Pick one to see its details.
2. **Read the brief.** The hackathon page shows the dates, the rounds and their deadlines, and the rubric. The rubric tells you exactly what judges score and how much each criterion counts towards your total.
3. **Enter your project.** Fill in the entry form at the bottom of the hackathon's page. First choose whether you're entering as a team or on your own; teams also give a team name. You'll need a project title, a description, your name and your email, and four links: a video demo, your pitch deck, your live prototype and your GitHub repository. Only the organisers and judges can see your email address.
4. **Get your project page.** After you submit, you get a public project page at `/project/<id>`. Share it with your team or anyone else.
5. **Follow the standings.** The **Live standings** on the hackathon page refresh as judges score. Open any project to see how many points each criterion contributed to its weighted total. Only averaged scores are shown, never individual judges' marks.

### For judges

1. **Accept your invitation.** Open the invitation email and set up your account. You'll land on **My Dashboard**, which shows the projects assigned to you, how many you've completed and the days left.
2. **Score each project.** Open your **Scoring Queue** and work through each project's materials: its concept note, pitch deck, live site and repository. Score every rubric criterion and write feedback for the team. You can also keep private notes and generate an AI summary to help you review. Your work saves automatically.
3. **Review your results.** **Results** shows the scores you've given.

