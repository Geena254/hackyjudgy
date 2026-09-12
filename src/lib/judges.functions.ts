import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inviteInput = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().max(120).optional(),
  expertise: z.string().trim().max(120).optional(),
  appOrigin: z.string().trim().url().max(300),
});

export const inviteJudge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(inviteInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (!adminRole) throw new Error("Only admins can invite judges.");


    const email = data.email.toLowerCase();

    const { error: insertError } = await supabase.from("judge_invitations").upsert(
      {
        email,
        full_name: data.fullName ?? null,
        expertise: data.expertise ?? null,
        status: "pending",
        invited_by: userId,
      },
      { onConflict: "email" },
    );
    if (insertError) throw new Error(insertError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${data.appOrigin}/auth`,
      data: { full_name: data.fullName ?? null, invited_as: "judge" },
    });

    if (inviteError) {
      const already = /already been registered|already exists/i.test(inviteError.message);
      if (!already) throw new Error(inviteError.message);

      // The person already has an account: grant judging access now and email a sign-in link.
      let existingId: string | null = null;
      for (let page = 1; page <= 10 && !existingId; page++) {
        const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) break;
        const match = users.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (match) existingId = match.id;
        if (users.users.length < 200) break;
      }
      if (existingId) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: existingId, role: "judge" }, { onConflict: "user_id,role" });
      }

      const { error: linkError } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${data.appOrigin}/auth` },
      });
      if (linkError) {
        return {
          emailed: false,
          message: `${email} already has an account and now has judging access. We couldn't email a sign-in link — ask them to sign in normally.`,
        };
      }
      return {
        emailed: true,
        message: `${email} already had an account — judging access granted and a sign-in link emailed.`,
      };
    }

    return { emailed: true, message: `Invitation email sent to ${email}.` };
  });


export const listInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("judge_invitations")
      .select("id, email, full_name, expertise, status, created_at, accepted_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only admins can manage judge invitations.");
}

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: invite, error: fetchError } = await supabase
      .from("judge_invitations")
      .select("id, email, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!invite) throw new Error("Invitation not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find the invited account (if any) so we can invalidate the invite link.
    let account: { id: string; last_sign_in_at: string | null } | null = null;
    for (let page = 1; page <= 10 && !account; page++) {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const match = users.users.find(
        (u) => (u.email ?? "").toLowerCase() === invite.email.toLowerCase(),
      );
      if (match) account = { id: match.id, last_sign_in_at: match.last_sign_in_at ?? null };
      if (users.users.length < 200) break;
    }

    let message = "";
    if (account && !account.last_sign_in_at) {
      // Never signed in — delete the pending account so the emailed link stops working.
      const { error } = await supabaseAdmin.auth.admin.deleteUser(account.id);
      if (error) throw new Error(error.message);
      message = "Invitation withdrawn — the emailed link no longer works.";
    } else if (account) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", account.id)
        .eq("role", "judge");
      if (error) throw new Error(error.message);
      message = "Access withdrawn — this judge can no longer score submissions.";
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

