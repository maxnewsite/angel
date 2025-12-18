import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = maybeHandleCors(req);
  if (cors) return cors;

  try {
    const { user } = await requireRole(req, ["admin", "ic_member", "ic_chair"]);

    const { deal_id, vote, confidence, comment } = await req.json();
    const dealId = String(deal_id ?? "");
    const v = String(vote ?? "");
    const conf = Number.isFinite(Number(confidence)) ? Number(confidence) : null;
    const c = String(comment ?? "");

    if (!dealId || !v) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deal, error: dErr } = await adminClient
      .from("deals")
      .select("status")
      .eq("id", dealId)
      .single();
    if (dErr) throw dErr;

    if (String(deal.status) !== "ic_in_review") {
      return new Response(JSON.stringify({ error: "Deal is not in ic_in_review" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert on UNIQUE (deal_id, ic_member_user_id)
    const { error } = await adminClient.from("ic_votes").upsert(
      {
        deal_id: dealId,
        ic_member_user_id: user.id,
        vote: v,                 // must match your ic_votes.vote enum label
        confidence: conf,
        comment: c,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "deal_id,ic_member_user_id" },
    );

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
