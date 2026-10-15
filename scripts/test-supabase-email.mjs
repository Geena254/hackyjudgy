/**
 * Supabase Auth Email Test Script
 *
 * Usage:
 *   node scripts/test-supabase-email.mjs <recipient-email> [optional-site-origin]
 *
 * Example:
 *   node scripts/test-supabase-email.mjs user@example.com https://yourdomain.com
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

const targetEmail = process.argv[2];
const appOrigin = process.argv[3] || "http://localhost:5173";

console.log("==================================================");
console.log("   GavelLab Supabase Auth Email Test Tool         ");
console.log("==================================================");
console.log("");

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY are required in .env");
  process.exit(1);
}

if (!targetEmail) {
  console.error("❌ Error: Please provide a recipient email address.");
  console.log("Usage: node scripts/test-supabase-email.mjs your-email@domain.com");
  process.exit(1);
}

console.log(`- Supabase URL: ${supabaseUrl}`);
console.log(`- Target Email: ${targetEmail}`);
console.log(`- Redirect URL: ${appOrigin}/auth`);
console.log("");

const supabaseAdmin = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  try {
    console.log("1. Sending Supabase OTP / Magic Link sign-in email...");
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${appOrigin}/auth`,
      },
    });

    if (error) {
      // If user doesn't exist, try inviting user
      console.log(`Notice: ${error.message}`);
      console.log("2. Attempting to send invite email via supabaseAdmin.auth.admin.inviteUserByEmail...");
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        targetEmail,
        {
          redirectTo: `${appOrigin}/auth?mode=signup`,
          data: { invited_as: "judge" },
        }
      );

      if (inviteError) {
        throw inviteError;
      }

      console.log("✅ SUCCESS: Supabase invite email sent successfully!");
      console.log(inviteData);
    } else {
      console.log("✅ SUCCESS: Supabase Auth email sent successfully!");
      console.log(data);
    }

    console.log("");
    console.log("If your Supabase project is configured with SendGrid SMTP (in Project Settings > Auth > SMTP),");
    console.log("this email was delivered via SendGrid. Please check your inbox!");
  } catch (err) {
    console.error("❌ Supabase Email Error:", err.message || err);
    console.log("");
    console.log("To configure SendGrid in Supabase:");
    console.log("1. Open Supabase Dashboard -> Project Settings -> Authentication -> SMTP Settings");
    console.log("2. Enable Custom SMTP");
    console.log("3. Host: smtp.sendgrid.net, Port: 587, User: apikey, Password: <Your SendGrid API Key>");
    console.log("4. Sender email: a verified Sender in SendGrid (e.g. noreply@yourdomain.com)");
    process.exit(1);
  }
}

run();
