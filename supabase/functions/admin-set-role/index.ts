import { corsHeaders, maybeHandleCors } from "../_shared/cors.ts";
import { adminClient, requireRole } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const cors = maybeHandleCors(req);
  if (cors) return cors;

  try {
    await requireRole(req, ["admin"]);

    const { user_id, role } = await req.json();

    const uid = String(user_id ?? "");
    const r = String(role ?? "");

    if (!uid || !r) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await adminClient.from("profiles").update({ role: r }).eq("id", uid);
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

