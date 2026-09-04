import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEvents from "./tools/list-events";
import listSubmissions from "./tools/list-submissions";
import getRubric from "./tools/get-rubric";
import scoreSubmission from "./tools/score-submission";
import myScoringProgress from "./tools/my-scoring-progress";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "evaldesk-insights",
  title: "EvalDesk Insights",
  version: "0.1.0",
  instructions:
    "Tools for EvalDesk, a hackathon judging and scoring platform. Use list_events to find an event, get_rubric for its rounds and criteria, list_submissions for the projects, score_submission to record the signed-in judge's scores and feedback, and my_scoring_progress to review what that judge has already scored. All access follows the signed-in user's permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEvents, getRubric, listSubmissions, scoreSubmission, myScoringProgress],
});
