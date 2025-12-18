"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function DealflowInbox() {
  const [rows, setRows] = useState<any[]>([]);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // Get user role
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (uid) {
        const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).single();
        setRole(p?.role ?? null);
      }

      const { data, error } = await supabase
        .from("deals")
        .select("id,status,created_at,startup:startup_id(name,sector,hq_location)")
        .in("status", ["submitted","screening_in_progress"])
        .order("created_at", { ascending: false });
      if (error) return console.error(error);
      setRows(data ?? []);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Dealflow inbox</div>
        <div className="text-sm text-black/60">
          Deals awaiting screening or currently in screening.
          {role === "dealflow_analyst" && (
            <span className="ml-2 text-blue-600">
              (You are a dealflow analyst - you can analyze deals but only managers can submit to IC)
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((d) => (
          <Link key={d.id} href={`/app/deals/${d.id}`}>
            <Card className="transition hover:translate-y-[-1px]">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{d.startup?.name ?? "Startup"}</div>
                    <div className="mt-1 text-xs text-black/60">
                      {(d.startup?.sector ?? "—")} • {(d.startup?.hq_location ?? "—")}
                    </div>
                  </div>
                  <Badge>{d.status}</Badge>
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? <div className="text-sm text-black/60">No deals in inbox.</div> : null}
    </div>
  );
}
