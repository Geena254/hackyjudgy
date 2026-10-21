import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteInput = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().max(120).optional(),
  expertise: z.string().trim().max(120).optional(),
  appOrigin: z.string().trim().url().max(300),
  eventId: z.string().uuid(),
});

type AdminClient = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** The platform account for an email address, if one exists. */
async function findAccount(supabaseAdmin: AdminClient, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = users.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (match) return { id: match.id, last_sign_in_at: match.last_sign_in_at ?? null };
    if (users.users.length < 200) break;
  }
  return null;
}

/**
 * Invite a judge to one hackathon. Someone new gets an email to create their
 * account; someone already on the platform is added straight away and can
 * start judging it.
 */
export const inviteJudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(inviteInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrganiser(supabase, userId, "Only organisers can invite judges.");

    const email = data.email.toLowerCase();
    const { getServerConfig } = await import("@/lib/config.server");
    const { siteUrl } = getServerConfig();

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name")
      .eq("id", data.eventId)
      .maybeSingle();
    if (eventError) throw new Error(eventError.message);
    if (!event) throw new Error("Hackathon not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const account = await findAccount(supabaseAdmin, email);

    // The database only accepts invitations to hackathons this organiser runs.
    const { error: insertError } = await supabase.from("judge_invitations").upsert(
      {
        email,
        event_id: event.id,
        full_name: data.fullName ?? null,
        expertise: data.expertise ?? null,
        status: account ? "accepted" : "pending",
        accepted_at: account ? new Date().toISOString() : null,
        invited_by: userId,
      },
      { onConflict: "email,event_id" },
    );
    if (insertError) throw new Error(insertError.message);

    if (account) {
      // Already on the platform: judging access now, and a sign-in link to get started.
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: account.id, role: "judge" }, { onConflict: "user_id,role" });
      if (roleError) throw new Error(roleError.message);

      const { error: linkError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl}/auth` },
      });
      return {
        emailed: !linkError,
        message: linkError
          ? `${email} is already on GavelLab and can judge ${event.name} now. We couldn't email them a sign-in link - let them know to sign in.`
          : `${email} is already on GavelLab - added to ${event.name} and emailed a sign-in link to start judging.`,
      };
    }

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/auth?mode=signup`,
      data: { full_name: data.fullName ?? null, invited_as: "judge" },
    });
    if (inviteError) throw new Error(inviteError.message);

    return { emailed: true, message: `Invitation to judge ${event.name} sent to ${email}.` };
  });

export const listInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("judge_invitations")
      .select("id, email, full_name, expertise, status, created_at, accepted_at")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Platform admins and organisers can manage judges; the database scopes organisers to their own. */
async function assertOrganiser(supabase: any, userId: string, message: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "organiser"]);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(message);
}

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertOrganiser(supabase, userId, "Only organisers can manage judge invitations.");

    const { data: invite, error: fetchError } = await supabase
      .from("judge_invitations")
      .select("id, email, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!invite) throw new Error("Invitation not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The judge may also be on other hackathons. Then only this invitation is
    // withdrawn, and they keep their account and keep judging the others.
    const { count: otherInvites, error: countError } = await supabaseAdmin
      .from("judge_invitations")
      .select("id", { count: "exact", head: true })
      .eq("email", invite.email.toLowerCase())
      .neq("id", invite.id)
      .in("status", ["pending", "accepted"]);
    if (countError) throw new Error(countError.message);
    if (otherInvites) {
      const { error } = await supabase
        .from("judge_invitations")
        .update({ status: "revoked", accepted_at: null })
        .eq("id", invite.id);
      if (error) throw new Error(error.message);
      return { message: "Access withdrawn - this judge can no longer score this hackathon." };
    }

    // Find the invited account (if any) so we can invalidate the invite link.
    const account = await findAccount(supabaseAdmin, invite.email);

    let message = "";
    if (account && !account.last_sign_in_at) {
      // Never signed in - delete the pending account so the emailed link stops working.
      const { error } = await supabaseAdmin.auth.admin.deleteUser(account.id);
      if (error) throw new Error(error.message);
      message = "Invitation withdrawn - the emailed link no longer works.";
    } else if (account) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", account.id)
        .eq("role", "judge");
      if (error) throw new Error(error.message);
      message = "Access withdrawn - this judge can no longer score submissions.";
    } else {
      message = "Invitation withdrawn.";
    }

    const { error: updateError } = await supabase
      .from("judge_invitations")
      .update({ status: "revoked", accepted_at: null })
      .eq("id", invite.id);
    if (updateError) throw new Error(updateError.message);

    return { message };
  });

