import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = maybeHandleCors(req);
  if (cors) return cors;

  try {
    const { user } = await requireRole(req, ["admin"]);

    const { deal_id, assigned_to_user_id } = await req.json();
    const dealId = String(deal_id ?? "");
    const assigneeId = String(assigned_to_user_id ?? "");

    if (!dealId || !assigneeId) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // optional: ensure assignee is dealflow_manager
    const { data: p, error: pErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", assigneeId)
      .single();
    if (pErr) throw pErr;

    const role = String(p.role);
    if (role !== "dealflow_manager" && role !== "admin") {
      return new Response(JSON.stringify({ error: "Assignee must be dealflow_manager or admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await adminClient.from("deal_assignments").insert({
      deal_id: dealId,
      assigned_to_user_id: assigneeId,
      assigned_by_user_id: user.id,
      assigned_at: new Date().toISOString(),
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
