import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

export function json(status: number, body: unknown, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export async function requireUserAndRole(req: Request, allowedRoles: string[]) {
  const Authorization = req.headers.get("Authorization") ?? "";
  const supabase = createClient(url, anon, { global: { headers: { Authorization } } });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (pErr || !profile?.role) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const role = String(profile.role);
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: "Forbidden: insufficient role" };
  }

  return { ok: true, user: data.user, profile, supabase };
}
