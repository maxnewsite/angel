"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function FounderDeals() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) return;

      // deals where user owns the startup
      const { data, error } = await supabase
        .from("deals")
        .select("id,status,round_type,created_at,startup:startup_id(name)")
        .order("created_at", { ascending: false });

      if (error) return console.error(error);
      setRows(data ?? []);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-semibold">My submissions</div>
          <div className="text-sm text-black/60">Create and manage deals for your startup.</div>
        </div>
        <Link href="/app/founder/deals/new"><Button>New deal</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((d) => (
          <Link key={d.id} href={`/app/deals/${d.id}`}>
            <Card className="transition hover:translate-y-[-1px]">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{d.startup?.name ?? "Startup"}</div>
                    <div className="mt-1 text-xs text-black/60">Round: {d.round_type ?? "—"}</div>
                  </div>
                  <Badge>{d.status}</Badge>
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? <div className="text-sm text-black/60">No deals yet.</div> : null}
    </div>
  );
}
