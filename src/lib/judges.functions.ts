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

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Only admins can invite judges.");

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
      return { emailed: false, message: "This person already has an account — role recorded." };
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
