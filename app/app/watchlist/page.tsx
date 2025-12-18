"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function WatchlistPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;

      const { data, error } = await supabase
        .from("watchlists")
        .select("deal:deal_id(id,status,startup:startup_id(name,sector,hq_location))")
        .eq("user_id", uid);

      if (error) return console.error(error);
      setRows((data ?? []).map((r: any) => r.deal));
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Watchlist</div>
        <div className="text-sm text-black/60">Deals you saved.</div>
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

      {rows.length === 0 ? <div className="text-sm text-black/60">No watched deals yet.</div> : null}
    </div>
  );
}
