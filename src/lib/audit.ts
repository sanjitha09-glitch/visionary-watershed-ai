import { supabase } from "@/integrations/supabase/client";

/** Records an auditable action for the signed-in user. Failures never block the UI. */
export async function logAudit(action: string, entity?: string, details?: Record<string, unknown>, status = "success") {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("audit_logs").insert({
      user_id: data.user.id,
      user_email: data.user.email ?? null,
      action,
      entity: entity ?? null,
      status,
      details: (details ?? null) as never,
    });
  } catch {
    /* audit is best-effort on the client; server-side jobs log independently */
  }
}
