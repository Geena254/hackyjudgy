/**
 * SendGrid & Supabase SMTP Test Script
 *
 * Usage:
 *   node scripts/test-sendgrid.mjs <recipient-email>
 *
 * Example:
 *   node scripts/test-sendgrid.mjs user@example.com
 */

import nodemailer from "nodemailer";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load .env manually if not already populated
if (existsSync(resolve(process.cwd(), ".env"))) {
  const envContent = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  }
}

const targetEmail = process.argv[2];

console.log("==================================================");
console.log("   GavelLab SendGrid SMTP Diagnostic & Test Tool   ");
console.log("==================================================");
console.log("");

const apiKey =
  process.env.SENDGRID_API_KEY ||
  process.env.SMTP_PASS ||
  "";

const smtpHost = process.env.SMTP_HOST || "smtp.sendgrid.net";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER || "apikey";
const fromEmail = process.env.SMTP_FROM || process.env.SENDER_EMAIL || "";

if (!apiKey) {
  console.error("❌ Error: Missing SendGrid API Key / SMTP Password.");
  console.log("");
  console.log("Please set the following in your `.env` file:");
  console.log("  SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  console.log("  SMTP_HOST=smtp.sendgrid.net");
  console.log("  SMTP_PORT=587");
  console.log("  SMTP_USER=apikey");
  console.log("  SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  console.log("  SMTP_FROM=noreply@yourdomain.com");
  console.log("");
  process.exit(1);
}

if (!targetEmail) {
  console.log("⚠️ No recipient specified. Testing SMTP credentials and connection only.");
  console.log("To send an actual test email, run:");
  console.log("  node scripts/test-sendgrid.mjs your-email@domain.com");
  console.log("");
}

console.log("Configuration:");
console.log(`- SMTP Host: ${smtpHost}`);
console.log(`- SMTP Port: ${smtpPort}`);
console.log(`- SMTP User: ${smtpUser}`);
console.log(`- From Email: ${fromEmail || "(not set - will test connection only)"}`);
console.log(`- Target: ${targetEmail || "(none)"}`);
console.log("");

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: apiKey,
  },
});

async function run() {
  try {
    console.log("1. Verifying SMTP server connection...");
    await transporter.verify();
    console.log("✅ SUCCESS: Connected to SendGrid SMTP server with valid credentials!");
    console.log("");

    if (targetEmail) {
      if (!fromEmail) {
        console.warn("⚠️ Warning: SMTP_FROM is not set in .env.");
        console.warn("SendGrid requires a verified sender identity (e.g. noreply@yourdomain.com).");
        console.log("");
      }

      console.log(`2. Sending sample email to: ${targetEmail}...`);
      const info = await transporter.sendMail({
        from: fromEmail || "noreply@gavellab.com",
        to: targetEmail,
        subject: "GavelLab — SendGrid SMTP Test Verification",
        text: "Hello! This is a verification email from GavelLab confirming that your SendGrid SMTP configuration is working properly.",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">GavelLab Email System Test</h2>
            <p style="color: #334155; line-height: 1.5;">This email confirms that your <strong>SendGrid SMTP</strong> configuration is active, authenticated, and successfully delivering emails.</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px 16px; margin: 20px 0;">
              <p style="margin: 0; color: #0f172a; font-size: 14px;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <p style="margin: 4px 0 0; color: #0f172a; font-size: 14px;"><strong>Host:</strong> ${smtpHost}:${smtpPort}</p>
            </div>
            <p style="color: #64748b; font-size: 13px; margin-bottom: 0;">GavelLab — Hackathon & Pitch Judging Platform</p>
          </div>
        `,
      });

      console.log("✅ SUCCESS: Email accepted by SendGrid!");
      console.log(`- Message ID: ${info.messageId}`);
      console.log(`- Response: ${info.response}`);
      console.log("");
      console.log("🎉 Everything is configured and working! Please check your inbox (and spam folder).");
    }
  } catch (error) {
    console.error("❌ SendGrid SMTP Test Failed:");
    console.error(error.message || error);
    if (error.response) {
      console.error("Server Response:", error.response);
    }
    console.log("");
    console.log("Common reasons for failure:");
    console.log("1. SendGrid API Key does not have 'Mail Send' permissions.");
    console.log("2. The 'From' email address is not verified under SendGrid 'Sender Authentication'.");
    console.log("3. Firewall or ISP is blocking port 587 (try port 465 or port 25).");
    process.exit(1);
  }
}

run();
