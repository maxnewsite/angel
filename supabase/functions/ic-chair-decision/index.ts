import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

// IMPORTANT: adjust these if your deals.status enum differs
const allowedDecision = ["recommended", "rejected", "published"];

Deno.serve(async (req) => {
  const cors = maybeHandleCors(req);
  if (cors) return cors;

  try {
    const { user } = await requireRole(req, ["admin", "ic_chair"]);

    const { deal_id, decision, rationale } = await req.json();
    const dealId = String(deal_id ?? "");
    const d = String(decision ?? "");
    const r = String(rationale ?? "");

    if (!dealId || !allowedDecision.includes(d)) {
      return new Response(JSON.stringify({ error: "Invalid payload/decision" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patch: Record<string, unknown> = {
      status: d,
      updated_at: new Date().toISOString(),
    };
    if (d === "published") patch.published_at = new Date().toISOString();

    const { error: uErr } = await adminClient.from("deals").update(patch).eq("id", dealId);
    if (uErr) throw uErr;

    const { error: iErr } = await adminClient.from("ic_decisions").insert({
      deal_id: dealId,
      chair_user_id: user.id,
      decision: d,
      rationale: r,
      decided_at: new Date().toISOString(),
    });
    if (iErr) throw iErr;

    return new Response(JSON.stringify({ ok: true, deal_id: dealId, decision: d }), {
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
