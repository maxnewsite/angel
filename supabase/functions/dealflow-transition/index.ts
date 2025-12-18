import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

type Action = "start_screening" | "approve_to_ic" | "reject_screening";

Deno.serve(async (req) => {
  const cors = maybeHandleCors(req);
  if (cors) return cors;

  try {
    const { user } = await requireRole(req, ["dealflow_manager", "admin"]);

    const body = await req.json();
    const deal_id = String(body?.deal_id ?? "");
    const action = body?.action as Action | undefined;

    if (!deal_id || !action) {
      return new Response(JSON.stringify({ error: "deal_id and action required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["start_screening", "approve_to_ic", "reject_screening"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: deal, error: dErr } = await adminClient
      .from("deals")
      .select("id,status")
      .eq("id", deal_id)
      .single();

    if (dErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let newStatus: string | null = null;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === "start_screening") {
      if (!["submitted", "draft"].includes(deal.status)) {
        return new Response(JSON.stringify({ error: "Invalid transition: deal must be in submitted or draft status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newStatus = "screening_in_progress";
    }

    if (action === "approve_to_ic") {
      if (!["screening_in_progress", "submitted", "draft"].includes(deal.status)) {
        return new Response(JSON.stringify({ error: "Invalid transition: deal must be in screening_in_progress, submitted, or draft status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newStatus = "ic_in_review";
      patch.approved_at = new Date().toISOString();
      patch.screening_decision = "approved";
      patch.screening_completed_at = new Date().toISOString();
    }

    if (action === "reject_screening") {
      if (!["screening_in_progress", "submitted", "draft"].includes(deal.status)) {
        return new Response(JSON.stringify({ error: "Invalid transition: deal must be in screening_in_progress, submitted, or draft status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      newStatus = "screening_rejected";
      patch.screening_decision = "rejected";
      patch.screening_completed_at = new Date().toISOString();
    }

    if (!newStatus) {
      return new Response(JSON.stringify({ error: "No valid status transition" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: uErr } = await adminClient
      .from("deals")
      .update({ status: newStatus, ...patch })
      .eq("id", deal_id);

    if (uErr) {
      return new Response(JSON.stringify({ error: uErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity
    await adminClient.from("activity_log").insert({
      actor_user_id: user.id,
      entity_type: "deal",
      entity_id: deal_id,
      action: "dealflow_transition",
      metadata: { from: deal.status, to: newStatus, action },
    });

    return new Response(JSON.stringify({ ok: true, status: newStatus }), {
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
