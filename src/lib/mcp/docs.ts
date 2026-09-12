/**
 * Human-readable documentation for every MCP tool.
 * Shared by the admin Agent integrations page so the docs never drift.
 */
export type ToolDoc = {
  name: string;
  title: string;
  purpose: string;
  auth: string;
  inputs: { name: string; type: string; required: boolean; description: string }[];
  output: string;
};

export const MCP_SERVER_NAME = "GavelLab Insights";
export const MCP_ENDPOINT_PATH = "/mcp";
export const MCP_RATE_LIMIT_PER_MINUTE = 40;

export const MCP_ERROR_CODES: { code: string; meaning: string }[] = [
  { code: "UNAUTHENTICATED", meaning: "No valid GavelLab sign-in — reconnect the assistant." },
  { code: "ACCESS_REVOKED", meaning: "An admin revoked this assistant's access." },
  { code: "RATE_LIMITED", meaning: `More than ${MCP_RATE_LIMIT_PER_MINUTE} calls in one minute.` },
  { code: "PERMISSION_DENIED", meaning: "The account may not read or change that data." },
  { code: "NOT_FOUND", meaning: "The event, submission or rubric does not exist or is not visible." },
  { code: "INVALID_INPUT", meaning: "An id or value was not accepted." },
  { code: "DATABASE_ERROR", meaning: "The database rejected the request; details are included." },
  { code: "INTERNAL_ERROR", meaning: "Unexpected failure — retry, then contact an admin." },
];

export const MCP_TOOL_DOCS: ToolDoc[] = [
  {
    name: "list_events",
    title: "List hackathon events",
    purpose: "Find hackathons and their status and dates before calling any other tool.",
    auth: "Signed in. Judges see active events; admins also see drafts.",
    inputs: [],
    output: "{ events: [{ id, name, description, status, starts_on, ends_on }] }",
  },
  {
    name: "get_rubric",
    title: "Get event rubric",
    purpose: "Read an event's rounds and judging criteria, with weights and score scales.",
    auth: "Signed in. Follows the same visibility rules as the events list.",
    inputs: [
      { name: "event_id", type: "uuid", required: true, description: "Event to read the rubric for." },
    ],
    output:
      "{ event_id, rounds: [{ id, name, phase, deadline, submission_method, sort_order }], criteria: [{ id, round_id, name, description, weight, max_score, sort_order }] }",
  },
  {
    name: "list_submissions",
    title: "List submissions",
    purpose: "List the projects entered in an event, with team, category, status and links.",
    auth: "Admins and judges only.",
    inputs: [
      { name: "event_id", type: "uuid", required: true, description: "Event whose submissions to list." },
      {
        name: "status",
        type: "string",
        required: false,
        description: "Filter by status, e.g. submitted, under_review, scored.",
      },
    ],
    output:
      "{ event_id, count, submissions: [{ id, title, team_name, category, description, status, repo_url, demo_url, deck_url, round_id }] }",
  },
  {
    name: "score_submission",
    title: "Score a submission",
    purpose: "Record the signed-in judge's rubric scores, feedback, private notes and completion.",
    auth: "Signed-in judge. Writes only that judge's own scores and review.",
    inputs: [
      { name: "submission_id", type: "uuid", required: true, description: "Submission being scored." },
      {
        name: "scores",
        type: "array of { criterion_id: uuid, value: integer 0-100 }",
        required: true,
        description: "One entry per criterion, on that criterion's scale.",
      },
      { name: "feedback", type: "string (max 4000)", required: false, description: "Shared with organisers." },
      { name: "private_notes", type: "string (max 4000)", required: false, description: "Visible only to this judge." },
      { name: "completed", type: "boolean", required: false, description: "Mark the review as finished." },
    ],
    output: "{ submission_id, submission_title, saved }",
  },
  {
    name: "my_scoring_progress",
    title: "My scoring progress",
    purpose: "Review what the signed-in judge has already scored and finished.",
    auth: "Signed-in judge. Returns only that judge's own scores and reviews.",
    inputs: [],
    output:
      "{ scores: [{ submission_id, criterion_id, value }], reviews: [{ submission_id, feedback, private_notes, completed, updated_at }], completed_count }",
  },
  {
    name: "export_submission_results",
    title: "Export submission results",
    purpose: "Export a submission's final weighted score, rank and judge feedback as JSON.",
    auth: "Signed in. Admins see all judges; a judge sees only their own scores and feedback.",
    inputs: [
      { name: "submission_id", type: "uuid", required: true, description: "Submission to export." },
      {
        name: "include_criteria_breakdown",
        type: "boolean",
        required: false,
        description: "Include per-criterion averages (default true).",
      },
    ],
    output:
      "{ submission: { id, title, team_name, category, status, event_id }, final_score_percent, judges_scored, rank, ranked_out_of, criteria: [{ criterion_id, name, weight, max_score, average, scores_recorded }], feedback: [{ judge_id, feedback, completed, updated_at }], scope }",
  },
];
