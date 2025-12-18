"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ICQueue() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("deals")
        .select("id,status,created_at,startup:startup_id(name,sector,hq_location)")
        .in("status", ["ic_in_review","published"])
        .order("created_at", { ascending: false });

      if (error) return console.error(error);
      setRows(data ?? []);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">IC queue</div>
        <div className="text-sm text-black/60">Deals currently in IC review (or already published).</div>
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

      {rows.length === 0 ? <div className="text-sm text-black/60">No deals in IC queue.</div> : null}
    </div>
  );
}
