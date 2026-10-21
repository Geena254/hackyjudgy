/**
 * Seeds the "Inuka Launchpad Demo" event with its rounds, Venture Hackathon
 * grading rubric and teams, and closes older demo events so judges only see
 * this one.
 *
 * Usage:
 *   node scripts/seed-inuka-launchpad.mjs
 *
 * Safe to re-run: the event is looked up by name, and teams are matched by
 * project title so they are updated rather than duplicated.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Load .env
if (existsSync(resolve(process.cwd(), ".env"))) {
  const envContent = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY are required in .env");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EVENT_NAME = "Inuka Launchpad Demo";

const ROUNDS = [
  { name: "Round 1: Concept notes", phase: "submissions", sort_order: 1 },
  { name: "Round 2: Panel judging", phase: "judging", sort_order: 2 },
  { name: "Round 3: Results", phase: "results", sort_order: 3 },
];

// Venture Hackathon grading rubric (100 pts). Score 0-5, half points allowed;
// points = (score ÷ 5) × weight.
const rubric = (summary, levels) =>
  [summary, "", ...levels.map(([label, text]) => `${label}: ${text}`)].join("\n");

const CRITERIA = [
  {
    name: "Problem Validation",
    weight: 25,
    max_score: 5,
    sort_order: 1,
    description: rubric("The pain point being addressed.", [
      ["5 Excellent", "Pain point precise and quantified (who hurts, how often, what it costs). Primary evidence: interviews, pilots or field data from the exact target segment. Root cause articulated, not just symptoms. Evidence survives Q&A."],
      ["4 Good", "Clear pain with mixed primary + secondary evidence. Quantification mostly solid; segment defined. Minor gaps in sample size or recency."],
      ["3 Adequate", "Problem plausible but leans on secondary research or anecdotes. Size, frequency or cost fuzzy; segment too broad."],
      ["2 Weak", "Asserted problem with thin evidence. Unclear who actually suffers or pays. Validates a symptom at best."],
      ["0-1 Missing", "No meaningful validation; a solution in search of a problem."],
    ]),
  },
  {
    name: "Solution Awesomeness",
    weight: 20,
    max_score: 5,
    sort_order: 2,
    description: rubric("How strong and distinctive the solution is.", [
      ["5 Excellent", "Elegant, distinctive fit to the validated pain. Clever mechanism or UX; handles edge cases and compliance; credible 'why now'. Genuine wow factor in the room."],
      ["4 Good", "Strong fit with clear differentiators; main edge cases covered; technically feasible. Impressive but not breathtaking."],
      ["3 Adequate", "Sound but conventional; incremental improvement on what exists. Gaps in edge cases, compliance or usability."],
      ["2 Weak", "Generic or mismatched to the stated pain; feasibility doubts raised in Q&A."],
      ["0-1 Missing", "Unclear, infeasible, or assembled with no insight of its own."],
    ]),
  },
  {
    name: "Working Solution Demo",
    weight: 25,
    max_score: 5,
    sort_order: 3,
    description: rubric("Does the core flow actually work live? (Below 2.0 = ineligible for podium places.)", [
      ["5 Excellent", "Live end-to-end core flow with real integrations/data (payments, SMS/USSD, APIs, hardware). Graceful error handling; demo matches the pitch; nothing hidden behind the curtain."],
      ["4 Good", "End-to-end works but partly sandboxed or scripted; minor mocks disclosed up front. Solid and believable."],
      ["3 Adequate", "Core flow partially works; key steps mocked or skipped; team recovers from hiccups but scope is visibly reduced."],
      ["2 Weak", "Click-through prototype or slides only; core flow never actually executes live."],
      ["0-1 Missing", "Demo fails, is absent, or is clearly vapourware."],
    ]),
  },
  {
    name: "Business Value",
    weight: 20,
    max_score: 5,
    sort_order: 4,
    description: rubric("USP for customers AND vendors.", [
      ["5 Excellent", "Crisp USP for both sides of the market. Unit economics shown with numbers (pricing, margin, CAC/LTV or cost-to-serve). Defensible against incumbents; credible path to scale."],
      ["4 Good", "Clear value for both sides; economics directional but credible; some defensibility (data, network, distribution)."],
      ["3 Adequate", "Value prop tells only one side (customer or vendor); economics hand-wavy; little separation from existing players."],
      ["2 Weak", "Revenue model vague; no compelling reason for customers to switch or vendors to care."],
      ["0-1 Missing", "No coherent business logic."],
    ]),
  },
  {
    name: "Call to Action",
    weight: 10,
    max_score: 5,
    sort_order: 5,
    description: rubric("How the team closes and what they ask for.", [
      ["5 Excellent", "Memorable close: specific ask (pilot, partner, funding with amount & use), 90-day milestones, obvious next step for the audience. Leaves the room energised to act now."],
      ["4 Good", "Clear ask and next steps; slightly generic or rushed in delivery."],
      ["3 Adequate", "Generic CTA ('support us', 'follow us'); no timeline, no concrete ask."],
      ["2 Weak", "Abrupt ending; ask implied at best."],
      ["0-1 Missing", "No call to action."],
    ]),
  },
];

// Older demo events to close so judges only see this one.
const CLOSE_EVENTS = ["EvalDesk Open Hackathon 2026"];

const TEAMS = [
  {
    title: "Motor Insurance",
    concept: "Takaful Connect",
    members: ["Caleb Munyekenye", "Michael Randa", "Amos Ndungo", "Kevin Nyakundi"],
    concept_note_url: "https://docs.google.com/document/d/1BiPc-j7wiPjM9T7Bj2pSvQb0Nd7LG2_fSfrgwNuAqMU/edit?usp=sharing",
    pitch_deck_url: "", // paste the pitch deck link here
    live_site_url: "", // paste the live site link here
  },
  {
    title: "Power",
    concept: "Kenya GreenBridge",
    members: ["Brenda Chepkirui", "Valentine Kerubo", "Alex Kariuki"],
    concept_note_url: "https://docs.google.com/document/d/1pDkS5KDGgquk4_vHk0LWfO2n1LsskkluHtv9MOrRVfU/edit?usp=sharing",
    pitch_deck_url: "", // paste the pitch deck link here
    live_site_url: "", // paste the live site link here
  },
  {
    title: "Sacco Core Banking",
    concept: "NuruFinance Uganda",
    members: ["Emmanuel Bryan Auko", "Clymoh Mwangi", "Shantel Wambui", "Ian Ng'oche"],
    concept_note_url: "https://docs.google.com/document/d/16Nprg-kMlFJTXdnnABAHYtS2Q3YWjfpbZd-1adXnbeM/edit?usp=sharing",
    pitch_deck_url: "", // paste the pitch deck link here
    live_site_url: "", // paste the live site link here
  },
  {
    title: "Health Insurance",
    concept: "Claimwise (Null Terminators)",
    members: ["Ingrid Miriam", "Eugene Obunde", "Tristan Brian Kioko", "Silas Kibet", "Lameck Mugo"],
    concept_note_url: "https://docs.google.com/document/d/1C-w9QqFuSiftju--e9R-1Ng6ThWEhEJHcbr6MhafZl8/edit?usp=sharing",
    pitch_deck_url: "", // paste the pitch deck link here
    live_site_url: "", // paste the live site link here
  },
];

function check(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

async function run() {
  // Event
  const existing = check(
    await supabaseAdmin.from("events").select("id").eq("name", EVENT_NAME).limit(1),
    "Looking up event",
  );
  let eventId = existing[0]?.id;
  if (eventId) {
    check(await supabaseAdmin.from("events").update({ status: "active" }).eq("id", eventId), "Activating event");
    console.log(`- Event exists: ${eventId}`);
  } else {
    const created = check(
      await supabaseAdmin
        .from("events")
        .insert({
          name: EVENT_NAME,
          description: "Inuka Launchpad demo day: teams present their concept notes to the judging panel.",
          status: "active",
        })
        .select("id")
        .single(),
      "Creating event",
    );
    eventId = created.id;
    console.log(`- Created event: ${eventId}`);
  }

  // Rounds
  const roundIds = {};
  for (const round of ROUNDS) {
    const found = check(
      await supabaseAdmin.from("rounds").select("id").eq("event_id", eventId).eq("phase", round.phase).limit(1),
      "Looking up round",
    );
    roundIds[round.phase] =
      found[0]?.id ??
      check(
        await supabaseAdmin.from("rounds").insert({ ...round, event_id: eventId }).select("id").single(),
        `Creating round ${round.name}`,
      ).id;
  }
  console.log(`- Rounds ready (${ROUNDS.length})`);

  // Criteria on the judging round: update by name, add missing, remove unused
  const judgingRound = roundIds.judging;
  const haveCriteria = check(
    await supabaseAdmin.from("criteria").select("id,name").eq("round_id", judgingRound),
    "Looking up criteria",
  );
  for (const criterion of CRITERIA) {
    const match = haveCriteria.find((c) => c.name === criterion.name);
    if (match) {
      check(await supabaseAdmin.from("criteria").update(criterion).eq("id", match.id), `Updating ${criterion.name}`);
    } else {
      check(
        await supabaseAdmin.from("criteria").insert({ ...criterion, round_id: judgingRound }),
        `Creating ${criterion.name}`,
      );
    }
  }
  const stale = haveCriteria.filter((c) => !CRITERIA.some((k) => k.name === c.name));
  for (const c of stale) {
    const { count, error } = await supabaseAdmin
      .from("scores")
      .select("id", { count: "exact", head: true })
      .eq("criterion_id", c.id);
    if (error) throw new Error(`Checking scores: ${error.message}`);
    if (count) {
      console.log(`- Kept "${c.name}": it already has ${count} score(s)`);
      continue;
    }
    check(await supabaseAdmin.from("criteria").delete().eq("id", c.id), `Removing ${c.name}`);
    console.log(`- Removed old criterion: ${c.name}`);
  }
  console.log(`- Rubric ready (${CRITERIA.length} criteria, ${CRITERIA.reduce((s, c) => s + c.weight, 0)} pts)`);

  // Teams
  for (const team of TEAMS) {
    const payload = {
      event_id: eventId,
      round_id: judgingRound,
      title: team.title,
      team_name: team.concept,
      category: team.title,
      description: `Concept: ${team.concept}\n\nTeam members:\n${team.members.map((m) => `• ${m}`).join("\n")}`,
      submitter_name: team.members.join(", "),
      concept_note_url: team.concept_note_url,
      status: "submitted",
    };
    // Blank links are left out so they never wipe links entered in the app.
    if (team.pitch_deck_url) payload.deck_url = team.pitch_deck_url;
    if (team.live_site_url) payload.demo_url = team.live_site_url;
    const found = check(
      await supabaseAdmin.from("submissions").select("id").eq("event_id", eventId).eq("title", team.title).limit(1),
      "Looking up team",
    );
    if (found[0]) {
      const { status: _keep, ...update } = payload;
      check(await supabaseAdmin.from("submissions").update(update).eq("id", found[0].id), `Updating ${team.title}`);
      console.log(`- Updated: ${team.title}`);
    } else {
      check(await supabaseAdmin.from("submissions").insert(payload), `Creating ${team.title}`);
      console.log(`- Added: ${team.title}`);
    }
  }

  // Close other demo events so judges only see this one
  for (const name of CLOSE_EVENTS) {
    const closed = check(
      await supabaseAdmin.from("events").update({ status: "closed" }).eq("name", name).neq("status", "closed").select("id"),
      `Closing ${name}`,
    );
    if (closed.length) console.log(`- Closed: ${name}`);
  }

  console.log("");
  console.log(`✅ "${EVENT_NAME}" is active with ${TEAMS.length} teams.`);
}

run().catch((err) => {
  console.error("❌ Seed failed:", err.message || err);
  process.exit(1);
});
