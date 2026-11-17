import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AdminClient = typeof supabaseAdmin;

/**
 * For server functions that read and write with the server's own database
 * client: the same rule as private.can_manage_event. Platform admins manage
 * every hackathon, organisers only the ones they created.
 */
export async function canManageEvent(db: AdminClient, userId: string, eventId: string) {
  const { data: roles, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "organiser"]);
  if (error) throw new Error(error.message);
  if (roles?.some((r) => r.role === "admin")) return true;
  if (!roles?.some((r) => r.role === "organiser")) return false;
  const { data: event, error: eventError } = await db
    .from("events")
    .select("created_by")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) throw new Error(eventError.message);
  return event?.created_by === userId;
}
