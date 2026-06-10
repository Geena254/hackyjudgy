export type SubmissionStatus = "Submitted" | "Under Review" | "Scored" | "Pending";

export interface Submission {
  id: string;
  title: string;
  submitter: string;
  category: string;
  status: SubmissionStatus;
  score?: number;
  description: string;
  github?: string;
  youtube?: string;
  submittedAt: string;
}

export const submissions: Submission[] = [
  {
    id: "s1",
    title: "AI Resume Analyzer",
    submitter: "Alice Johnson",
    category: "AI/ML",
    status: "Scored",
    score: 4.5,
    description:
      "A machine learning system that parses resumes and provides skill-match insights for hiring managers, with bias detection built into the scoring pipeline.",
    github: "https://github.com/example/ai-resume",
    youtube: "https://youtube.com/example",
    submittedAt: "June 10, 2026 @ 2:30 PM",
  },
  {
    id: "s2",
    title: "ML Chatbot",
    submitter: "Bob Smith",
    category: "AI/ML",
    status: "Under Review",
    description:
      "Conversational assistant fine-tuned on customer-support transcripts, with retrieval-augmented responses for accurate product answers.",
    github: "https://github.com/example/ml-chatbot",
    submittedAt: "June 09, 2026 @ 5:12 PM",
  },
  {
    id: "s3",
    title: "IoT Smart Home Hub",
    submitter: "Carol Davis",
    category: "IoT",
    status: "Submitted",
    description:
      "Unified hub that bridges Zigbee, Z-Wave, and Matter devices with local-first automation and offline fallback for critical routines.",
    github: "https://github.com/example/iot-hub",
    submittedAt: "June 09, 2026 @ 11:04 AM",
  },
  {
    id: "s4",
    title: "Blockchain Voting App",
    submitter: "David Lee",
    category: "Blockchain",
    status: "Scored",
    score: 4.8,
    description:
      "Verifiable, anonymous voting on a permissioned ledger with end-to-end auditability for student and civic elections.",
    github: "https://github.com/example/bc-vote",
    youtube: "https://youtube.com/example",
    submittedAt: "June 08, 2026 @ 9:42 AM",
  },
  {
    id: "s5",
    title: "AR Education Game",
    submitter: "Eve Wilson",
    category: "AR/VR",
    status: "Pending",
    description:
      "Augmented reality scavenger hunt that teaches biology concepts by overlaying interactive 3D models onto classroom environments.",
    submittedAt: "June 08, 2026 @ 1:18 PM",
  },
  {
    id: "s6",
    title: "Climate Data Dashboard",
    submitter: "Frank Brown",
    category: "Data Science",
    status: "Submitted",
    description:
      "Interactive dashboard aggregating regional climate indicators with anomaly detection and shareable policy briefings.",
    github: "https://github.com/example/climate",
    submittedAt: "June 07, 2026 @ 4:55 PM",
  },
  {
    id: "s7",
    title: "Real-Time Translation API",
    submitter: "Grace Park",
    category: "NLP",
    status: "Under Review",
    description:
      "Low-latency speech-to-speech translation API supporting 18 languages with on-device fallback for privacy-sensitive use cases.",
    github: "https://github.com/example/rt-translate",
    youtube: "https://youtube.com/example",
    submittedAt: "June 07, 2026 @ 10:30 AM",
  },
  {
    id: "s8",
    title: "Autonomous Delivery Robot",
    submitter: "Henry Chen",
    category: "Robotics",
    status: "Scored",
    score: 4.2,
    description:
      "Sidewalk delivery robot with SLAM-based navigation, dynamic obstacle avoidance, and a tamper-evident cargo bay.",
    github: "https://github.com/example/delivery-bot",
    submittedAt: "June 06, 2026 @ 8:15 PM",
  },
];

export const categories = [
  "All Categories",
  "AI/ML",
  "IoT",
  "Blockchain",
  "AR/VR",
  "Data Science",
  "NLP",
  "Robotics",
];

export interface JudgeRow {
  name: string;
  scored: number;
  pending: number;
}

export const judges: JudgeRow[] = [
  { name: "Sarah Mitchell", scored: 8, pending: 0 },
  { name: "James Rodriguez", scored: 5, pending: 3 },
  { name: "Emily Watson", scored: 0, pending: 2 },
];

export const rubricCriteria = [
  { id: "originality", name: "Originality", description: "How novel is the idea or approach?" },
  { id: "feasibility", name: "Feasibility", description: "Can this realistically be built and shipped?" },
  { id: "ux", name: "User Experience", description: "Polish, clarity, and accessibility of the experience." },
  { id: "impact", name: "Impact & Scale", description: "Potential reach and meaningful change." },
];

export const activity = [
  { text: "Judge Sarah scored submission 'AI Resume Analyzer'", time: "2 hours ago", kind: "scored" as const },
  { text: "New submission: 'ML Chatbot'", time: "4 hours ago", kind: "new" as const },
  { text: "Judging window closes in 2 hours", time: "Today", kind: "warning" as const },
  { text: "Judge James Rodriguez joined the panel", time: "Yesterday", kind: "join" as const },
  { text: "Round 1 rubric was updated by admin", time: "Yesterday", kind: "edit" as const },
];

export interface RoundCfg {
  id: string;
  name: string;
  phase: "Submissions" | "Judging" | "Results";
  deadline: string;
  method: string;
}

export const rounds: RoundCfg[] = [
  { id: "r1", name: "Submissions", phase: "Submissions", deadline: "Closes June 15, 2026", method: "Google Forms" },
  { id: "r2", name: "Round 1 Judging", phase: "Judging", deadline: "Closes June 20, 2026", method: "Google Forms" },
  { id: "r3", name: "Finals", phase: "Results", deadline: "Closes June 28, 2026", method: "Google Forms" },
];
