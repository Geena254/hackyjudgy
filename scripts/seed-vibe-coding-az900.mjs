/**
 * Creates the "Vibe Coding Hackathon: AZ-900 Exam Prep Edition" (#1MillionDevs)
 * with its rounds and both judging rubrics, and publishes it so it's the
 * current hackathon on the public page.
 *
 * Usage:
 *   node scripts/seed-vibe-coding-az900.mjs
 *
 * Safe to re-run: the event is looked up by name, rounds by name, and criteria
 * by name within their round, so they are updated rather than duplicated.
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
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error(
    "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY are required in .env",
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EVENT_NAME = "Vibe Coding Hackathon: AZ-900 Exam Prep Edition";
const CONCEPT_NOTE_URL =
  "https://docs.google.com/document/d/1TvVPYB8HJ9lJCIBRlxd7aoC1Lo4TwvXZ/edit";
const DEADLINE_TEXT = "Friday 23 October 2026, 11:59 PM EAT";

const DESCRIPTION = `For the #1MillionDevs movement. You've prepared for Microsoft Azure Fundamentals (AZ-900) — now turn that experience into something that helps the next learner. Use AI-assisted and low-code tools to build an exam preparation tool that makes studying smarter, easier and more fun.

Theme: "Building Smarter Exam Prep Tools from Our Own Learning Journey."

Pick a challenge:
• Practice & Assessment — Smart Quiz Builder: instant feedback and clear explanations for every answer, organised by AZ-900 topic.
• Memory & Revision — Flashcard Coach: a flashcard or spaced-repetition tool that focuses on the concepts learners keep getting wrong.
• Planning — Personal Study Planner: a study plan built from the learner's exam date, available hours and weak areas.
• Support — AI Study Buddy: explains Azure concepts simply, with real-life African examples or in local languages.
• Progress — Readiness Tracker: a dashboard of practice scores by topic that shows how ready a learner is.

Important: don't copy real exam questions or use Microsoft logos. Base your content on the public AZ-900 skills outline on Microsoft Learn, write your own questions, and label your tool as unofficial.

Enter as a team or on your own — it's your choice.

What to submit by ${DEADLINE_TEXT}:
• Video demo link
• Pitch deck link
• Live prototype link
• GitHub repository link`;

const ROUNDS = [
  {
    name: "Build & submit",
    phase: "submissions",
    deadline: "2026-10-23",
    submission_method: `Video demo, pitch deck, live prototype and GitHub links, by ${DEADLINE_TEXT}. Enter as a team or on your own.`,
    sort_order: 1,
  },
  {
    name: "Project judging",
    phase: "judging",
    deadline: null,
    submission_method: "Judges score every project on the hackathon judging criteria.",
    sort_order: 2,
  },
  {
    name: "Pitch judging",
    phase: "judging",
    deadline: null,
    submission_method: "Teams pitch their tool; judges score the pitch.",
    sort_order: 3,
  },
];

// Scored 1–5 by each judge (half points allowed); weights are percentages.
const PROJECT_CRITERIA = [
  {
    name: "Learning Value",
    weight: 25,
    description:
      "Does the tool genuinely help someone prepare for AZ-900? Is the content accurate?",
  },
  {
    name: "Prompt Engineering",
    weight: 20,
    description: "Are your AI prompts accurate, effective and purposeful?",
  },
  {
    name: "User Experience & Vibes",
    weight: 15,
    description: "Clean, easy-to-use interface with “wow” moments that keep learners engaged.",
  },
  {
    name: "Rapid Prototyping & Execution",
    weight: 15,
    description: "How much did you build in the time? Smart tool use and adaptability.",
  },
  {
    name: "Technical Creativity",
    weight: 15,
    description: "Unique tool use, clever features and clean code.",
  },
  {
    name: "Presentation & Documentation",
    weight: 10,
    description: "GitHub repo, readable README and a working demo.",
  },
];

const PITCH_CRITERIA = [
  {
    name: "Problem Understanding",
    weight: 20,
    description: "Clearly explains the learner pain point, drawing on your own AZ-900 experience.",
  },
  {
    name: "Solution & Product",
    weight: 25,
    description: "Shows how the tool works through a demo, prototype or mockup.",
  },
  {
    name: "Target Users",
    weight: 15,
    description: "Identifies who the tool is for and how they'd use it.",
  },
  {
    name: "Impact & Scalability",
    weight: 20,
    description: "Explains how the tool could support more learners or other certifications.",
  },
  {
    name: "Clarity, Design & Delivery",
    weight: 20,
    description: "Well-structured deck and confident delivery.",
  },
];

function check(result, what) {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

async function upsertCriteria(roundId, criteria) {
  const have = check(
    await supabaseAdmin.from("criteria").select("id,name").eq("round_id", roundId),
    "Looking up criteria",
  );
  for (const [i, c] of criteria.entries()) {
    const row = { ...c, max_score: 5, sort_order: i + 1 };
    const match = have.find((h) => h.name === c.name);
    if (match) {
      check(
        await supabaseAdmin.from("criteria").update(row).eq("id", match.id),
        `Updating ${c.name}`,
      );
    } else {
      check(
        await supabaseAdmin.from("criteria").insert({ ...row, round_id: roundId }),
        `Creating ${c.name}`,
      );
    }
  }
}

async function run() {
  const eventFields = {
    name: EVENT_NAME,
    description: DESCRIPTION,
    starts_on: "2026-10-20",
    ends_on: "2026-10-23",
    status: "active",
  };

  // Event
  const existing = check(
    await supabaseAdmin.from("events").select("id").eq("name", EVENT_NAME).limit(1),
    "Looking up event",
  );
  let eventId = existing[0]?.id;
  if (eventId) {
    check(
      await supabaseAdmin.from("events").update(eventFields).eq("id", eventId),
      "Updating event",
    );
    console.log(`- Event exists, updated: ${eventId}`);
  } else {
    eventId = check(
      await supabaseAdmin.from("events").insert(eventFields).select("id").single(),
      "Creating event",
    ).id;
    console.log(`- Created event: ${eventId}`);
  }

  // Settings added by the 20261021090000 migration
  const { error: settingsError } = await supabaseAdmin
    .from("events")
    .update({ brief_url: CONCEPT_NOTE_URL, show_live_rankings: true })
    .eq("id", eventId);
  if (settingsError) {
    console.warn(
      `! Couldn't set the concept note link / live rankings (${settingsError.message}).` +
        " Apply the latest migrations, then re-run this script.",
    );
  } else {
    console.log("- Concept note linked, live rankings on");
  }

  // Rounds, matched by name
  const roundIds = {};
  for (const round of ROUNDS) {
    const found = check(
      await supabaseAdmin
        .from("rounds")
        .select("id")
        .eq("event_id", eventId)
        .eq("name", round.name)
        .limit(1),
      "Looking up round",
    );
    if (found[0]) {
      check(
        await supabaseAdmin.from("rounds").update(round).eq("id", found[0].id),
        `Updating ${round.name}`,
      );
      roundIds[round.name] = found[0].id;
    } else {
      roundIds[round.name] = check(
        await supabaseAdmin
          .from("rounds")
          .insert({ ...round, event_id: eventId })
          .select("id")
          .single(),
        `Creating ${round.name}`,
      ).id;
    }
  }
  console.log(`- Rounds ready (${ROUNDS.length})`);

  await upsertCriteria(roundIds["Project judging"], PROJECT_CRITERIA);
  await upsertCriteria(roundIds["Pitch judging"], PITCH_CRITERIA);
  console.log(
    `- Rubrics ready (project: ${PROJECT_CRITERIA.length} criteria, pitch: ${PITCH_CRITERIA.length} criteria)`,
  );

  console.log(`\n✅ ${EVENT_NAME} is live: /hackathon?event=${eventId}`);
}

run().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
