import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  title: z.string().max(300).optional(),
  text: z.string().trim().min(20, "Please provide at least a few sentences.").max(20000),
  criteria: z
    .array(z.object({ name: z.string(), description: z.string().nullable().optional(), weight: z.number() }))
    .max(30)
    .default([]),
});

const Summary = z.object({
  overview: z.string(),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  criteria_notes: z.array(z.object({ criterion: z.string(), note: z.string() })),
  questions_for_team: z.array(z.string()),
});

export type EvaluationSummary = z.infer<typeof Summary>;

export const summarizeSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; summary: EvaluationSummary } | { ok: false; error: string }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, error: "AI is not configured for this app." };

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const rubric = data.criteria.length
      ? data.criteria
          .map((c) => `- ${c.name} (weight ${c.weight})${c.description ? `: ${c.description}` : ""}`)
          .join("\n")
      : "No rubric provided.";

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        system:
          "You assist hackathon judges. Produce a concise, neutral evaluation summary of a submission. " +
          "Do not assign numeric scores. Keep overview under 80 words, at most 4 strengths, 4 concerns, " +
          "one short note per rubric criterion, and at most 3 questions for the team. Base everything only on the provided text.",
        prompt: `Submission title: ${data.title ?? "Untitled"}\n\nRubric:\n${rubric}\n\nSubmission text:\n${data.text}`,
        output: Output.object({ schema: Summary }),
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const summary = await result.output;
      return {
        ok: true,
        summary: {
          ...summary,
          strengths: summary.strengths.slice(0, 4),
          concerns: summary.concerns.slice(0, 4),
          questions_for_team: summary.questions_for_team.slice(0, 3),
        },
      };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 429) return { ok: false, error: "Too many requests right now. Please try again in a minute." };
      if (status === 402) return { ok: false, error: "AI credits have run out. Add credits in Settings → Plans & credits." };
      if (status === 403) return { ok: false, error: "AI access is not available for this workspace." };
      console.error("summarizeSubmission failed", e);
      return { ok: false, error: "Could not generate a summary. Please try again." };
    }
  });
