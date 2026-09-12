import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEvents from "./tools/list-events";
import listSubmissions from "./tools/list-submissions";
import getRubric from "./tools/get-rubric";
import scoreSubmission from "./tools/score-submission";
import myScoringProgress from "./tools/my-scoring-progress";
import exportResults from "./tools/export-results";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "gavellab-insights",
  title: "GavelLab Insights",
  version: "0.2.0",
  instructions:
    "Tools for GavelLab, a hackathon judging and scoring platform. Use list_events to find an event, get_rubric for its rounds and criteria, list_submissions for the projects, score_submission to record the signed-in judge's scores and feedback, my_scoring_progress to review what that judge has scored, and export_submission_results for a submission's final score, rank and feedback. All access follows the signed-in user's permissions. Errors come back as [CODE] message with a structured error payload; RATE_LIMITED means you exceeded 40 calls in a minute and ACCESS_REVOKED means an admin disconnected this assistant.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listEvents,
    getRubric,
    listSubmissions,
    scoreSubmission,
    myScoringProgress,
    exportResults,
  ],
});
