import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const RESULTS_BUCKET = "result-reports";

// 5 MB of PDF as base64.
const MAX_BASE64 = Math.ceil((5 * 1024 * 1024 * 4) / 3) + 4;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SendResultsOutcome = {
  submissionId: string;
  recipients: string[];
  failures: string[];
  sentAt: string;
};

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** "Smart Farm - AZ-900 Hackathon results.pdf", safe as a file name. */
export function resultsFileName(projectTitle: string, eventName: string) {
  const base = `${projectTitle} - ${eventName} results`
    .replace(/[\\/:*?"<>|\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${base || "Results"}.pdf`;
}

/**
 * Emails one team its results: the PDF (built in the organiser's browser) is
 * attached and also stored privately, behind a download link in the email.
 * It only ever goes to the entry's own submitter and team member addresses.
 */
export const sendTeamResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      submissionId: z.string().uuid(),
      pdfBase64: z.string().min(100).max(MAX_BASE64),
    }),
  )
  .handler(async ({ data, context }): Promise<SendResultsOutcome> => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { canManageEvent } = await import("@/lib/event-access.server");
    const { getServerConfig } = await import("@/lib/config.server");
    const mail = await import("@/lib/result-email.server");

    const { data: sub, error: subError } = await db
      .from("submissions")
      .select("id, event_id, title, team_name, submitter_name, submitter_email, team_member_emails")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (subError) throw new Error(subError.message);
    if (!sub) throw new Error("Entry not found.");
    if (!(await canManageEvent(db, context.userId, sub.event_id))) {
      throw new Error("Only this hackathon's organisers can email results.");
    }

    const cfg = mail.emailConfig();
    if (!cfg.apiKey || !cfg.from) {
      throw new Error(
        "Email is not set up: SENDGRID_API_KEY and SMTP_FROM are needed on the server.",
      );
    }

    // Who gets it: the submitter by name, teammates greeted by the team's name.
    const seen = new Set<string>();
    const recipients: { email: string; name: string }[] = [];
    const add = (raw: string | null | undefined, name: string) => {
      const email = (raw ?? "").trim().toLowerCase();
      if (!EMAIL.test(email) || seen.has(email)) return;
      seen.add(email);
      recipients.push({ email, name });
    };
    const teamGreeting = sub.team_name?.trim() || "participant";
    add(sub.submitter_email, sub.submitter_name?.trim() || teamGreeting);
    for (const e of sub.team_member_emails ?? []) add(e, teamGreeting);
    if (recipients.length === 0) throw new Error("This entry has no email address to send to.");

    let pdf: Uint8Array;
    try {
      pdf = base64ToBytes(data.pdfBase64);
    } catch {
      throw new Error("The PDF could not be read.");
    }
    if (String.fromCharCode(...pdf.slice(0, 5)) !== "%PDF-")
      throw new Error("That file is not a PDF.");

    const { data: event, error: eventError } = await db
      .from("events")
      .select("name")
      .eq("id", sub.event_id)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    const eventName = event?.name ?? "Hackathon";

    // Store the PDF and log the send first, so the link works when the email lands.
    const token = randomToken();
    const filePath = `${sub.event_id}/${sub.id}/${token}.pdf`;
    const fileName = resultsFileName(sub.title, eventName);
    const { error: uploadError } = await db.storage
      .from(RESULTS_BUCKET)
      .upload(filePath, pdf, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error(`Could not store the PDF: ${uploadError.message}`);

    const { data: logged, error: logError } = await db
      .from("result_emails")
      .insert({
        event_id: sub.event_id,
        submission_id: sub.id,
        token,
        file_path: filePath,
        file_name: fileName,
        recipients: recipients.map((r) => r.email),
        sent_by: context.userId,
      })
      .select("id, sent_at")
      .single();
    if (logError) {
      await db.storage.from(RESULTS_BUCKET).remove([filePath]);
      throw new Error(logError.message);
    }

    const siteUrl = getServerConfig().siteUrl;
    const downloadUrl = `${siteUrl}/report/${token}`;
    const logoUrl = `${siteUrl}/email/plp-logo.png`;

    const sent: string[] = [];
    const failures: string[] = [];
    for (const r of recipients) {
      const content = {
        greetingName: r.name,
        eventName,
        projectTitle: sub.title,
        downloadUrl,
        logoUrl,
        contact: cfg.contact,
      };
      try {
        await mail.sendWithSendGrid({
          to: r.email,
          subject: mail.resultEmailSubject(eventName),
          html: mail.resultEmailHtml(content),
          text: mail.resultEmailText(content),
          attachment: { base64: data.pdfBase64, filename: fileName, type: "application/pdf" },
        });
        sent.push(r.email);
      } catch (e) {
        failures.push(`${r.email}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (sent.length === 0) {
      // Nothing went out: leave no log row or file behind.
      await db.from("result_emails").delete().eq("id", logged.id);
      await db.storage.from(RESULTS_BUCKET).remove([filePath]);
      throw new Error(`No email could be sent. ${failures.join("; ")}`);
    }
    if (failures.length > 0) {
      await db.from("result_emails").update({ recipients: sent, failures }).eq("id", logged.id);
    }

    return { submissionId: sub.id, recipients: sent, failures, sentAt: logged.sent_at };
  });
