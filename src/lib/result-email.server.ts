import process from "node:process";

/**
 * The "your results are ready" email, in the Power Learn Project style (maroon
 * frame, centred logo and title, a highlighted download panel), and sending it
 * through SendGrid's HTTP API, which works on every host we deploy to (SMTP
 * sockets don't on Cloudflare Workers). Uses the same key as the SMTP settings.
 */

const MAROON = "#8B1538";
const BLUSH = "#FBF1F5";
const DEFAULT_CONTACT = "academy@powerlearnprojectafrica.org";

export function emailConfig() {
  return {
    apiKey: process.env["SENDGRID_API_KEY"] || process.env["SMTP_PASS"] || "",
    from: process.env["SMTP_FROM"] || process.env["SENDER_EMAIL"] || "",
    fromName: process.env["EMAIL_FROM_NAME"] || "Power Learn Project",
    contact: process.env["RESULTS_CONTACT_EMAIL"] || DEFAULT_CONTACT,
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ResultEmail = {
  /** Who the greeting names: a person, or the team. */
  greetingName: string;
  eventName: string;
  projectTitle: string;
  downloadUrl: string;
  logoUrl: string;
  contact: string;
};

export function resultEmailSubject(eventName: string) {
  return `🎉 Your ${eventName} results are here!`;
}

export function resultEmailHtml(e: ResultEmail) {
  const name = esc(e.greetingName);
  const event = esc(e.eventName);
  const project = esc(e.projectTitle);
  const link = esc(e.downloadUrl);
  const contact = esc(e.contact);
  const font = "Roboto, 'Segoe UI', Arial, Helvetica, sans-serif";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(resultEmailSubject(e.eventName))}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your results report for ${project} is ready to download.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;border:2px solid ${MAROON};font-family:${font};color:#111111;">
  <tr><td align="center" style="padding:32px 28px 0;">
    <img src="${esc(e.logoUrl)}" width="120" alt="Power Learn Project" style="display:block;border:0;outline:none;width:120px;height:auto;">
  </td></tr>
  <tr><td align="center" style="padding:24px 28px 0;">
    <h1 style="margin:0;font-family:${font};font-size:22px;line-height:1.35;font-weight:700;color:${MAROON};">🎉 Your ${event} results are ready</h1>
  </td></tr>
  <tr><td align="center" style="padding:10px 28px 0;font-size:14px;line-height:1.5;color:#333333;">
    Congratulations for taking part 🙌
  </td></tr>
  <tr><td style="padding:26px 28px 0;font-size:14px;line-height:1.6;color:#111111;">
    <p style="margin:0 0 14px;">Dear <strong>${name}</strong>,</p>
    <p style="margin:0;">Judging for <strong>${event}</strong> is complete. Your results report for <strong>${project}</strong> is attached to this email as a PDF, and you can download it below at any time.</p>
  </td></tr>
  <tr><td style="padding:24px 28px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BLUSH};border:1px solid ${MAROON};border-radius:8px;">
      <tr><td align="center" style="padding:26px 16px;">
        <p style="margin:0 0 16px;font-family:${font};font-size:15px;font-weight:700;color:${MAROON};">🏆Your results report</p>
        <a href="${link}" target="_blank" style="display:inline-block;background:${MAROON};color:#ffffff;font-family:${font};font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:4px;">📄 Download your PDF report</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 28px 32px;font-size:14px;line-height:1.6;color:#111111;">
    <p style="margin:0 0 14px;">If you have questions, reach out to <a href="mailto:${contact}" style="color:#1a56db;">${contact}</a>.<br/>
    We look forward to seeing what you will build next! 🥳</p>
    <p style="margin:0;">Power Regards,<br>Power Learn Project Team</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function resultEmailText(e: ResultEmail) {
  return [
    `🎉 Your ${e.eventName} results are ready`,
    "",
    `Dear ${e.greetingName},`,
    "",
    `Judging for ${e.eventName} is complete. Your results report for ${e.projectTitle} is attached to this email as a PDF, and you can download it at any time here:`,
    e.downloadUrl,
    "",
    `If you have questions, reach out to ${e.contact}.`,
    "We look forward to seeing what you will build next! 🥳",
    "",
    "Power Regards,",
    "Power Learn Project Team",
  ].join("\n");
}

/** Sends one email through SendGrid. Throws with SendGrid's reason when it is refused. */
export async function sendWithSendGrid(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachment?: { base64: string; filename: string; type: string };
}) {
  const cfg = emailConfig();
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: { email: cfg.from, name: cfg.fromName },
      reply_to: { email: cfg.contact },
      subject: msg.subject,
      content: [
        { type: "text/plain", value: msg.text },
        { type: "text/html", value: msg.html },
      ],
      ...(msg.attachment
        ? {
          attachments: [
            {
              content: msg.attachment.base64,
              filename: msg.attachment.filename,
              type: msg.attachment.type,
              disposition: "attachment",
            },
          ],
        }
        : {}),
    }),
  });
  if (res.ok) return;
  let reason = `SendGrid returned ${res.status}`;
  try {
    const body = (await res.json()) as { errors?: { message?: string }[] };
    const first = body.errors?.find((x) => x.message)?.message;
    if (first) reason = first;
  } catch {
    // keep the status-only reason
  }
  throw new Error(reason);
}
