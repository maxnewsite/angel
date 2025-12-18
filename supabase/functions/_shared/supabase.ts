import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const adminClient = createClient(url, service);

export function userClient(req: Request) {
  const Authorization = req.headers.get("Authorization") ?? "";
  return createClient(url, anon, { global: { headers: { Authorization } } });
}

export async function requireRole(req: Request, allowed: string[]) {
  const u = userClient(req);
  const { data, error } = await u.auth.getUser();
  if (error || !data?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { data: profile, error: pErr } = await u
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (pErr || !profile?.role) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
  const role = String(profile.role);
  if (!allowed.includes(role)) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  return { user: data.user, role };
}

