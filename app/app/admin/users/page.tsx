"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

type Row = { id: string; email: string | null; role: string };

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [roleMap, setRoleMap] = useState<Record<string,string>>({});

  async function load() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,role")
      .order("created_at", { ascending: false });

    if (error) return console.error(error);
    setRows((data as any) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function setRole(user_id: string) {
    const role = roleMap[user_id];
    if (!role) return;

    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess.session?.access_token;
    if (!jwt) return;

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-set-role`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ user_id, role }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || "Failed");
    await load();
  }

  const shown = rows.filter(r => {
    const f = filter.trim().toLowerCase();
    if (!f) return true;
    return (r.email ?? "").toLowerCase().includes(f) || r.role.toLowerCase().includes(f);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Users</div>
          <div className="text-sm text-black/60">Promote users to Dealflow Manager, Dealflow Analyst, or IC roles.</div>
        </div>
        <div className="w-full max-w-sm">
          <Input placeholder="Filter by email/role…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-semibold">Role management</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shown.map((u) => (
              <div key={u.id} className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white/50 p-3 backdrop-blur md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium">{u.email ?? u.id}</div>
                  <div className="mt-1"><Badge>{u.role}</Badge></div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm backdrop-blur"
                    value={roleMap[u.id] ?? u.role}
                    onChange={(e) => setRoleMap({ ...roleMap, [u.id]: e.target.value })}
                  >
                    {["investor","founder","dealflow_manager","dealflow_analyst","ic_member","ic_chair","admin"].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <Button variant="secondary" onClick={() => setRole(u.id)}>Save</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
