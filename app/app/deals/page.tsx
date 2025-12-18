"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/utils";

type DealRow = {
  id: string;
  status: string;
  round_type: string | null;
  target_amount: number | null;
  min_ticket: number | null;
  valuation: number | null;
  instrument: string | null;
  startup: { name: string; sector: string | null; hq_location: string | null } | null;
};

export default function DealsPage() {
  const [rows, setRows] = useState<DealRow[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("deals")
        .select("id,status,round_type,target_amount,min_ticket,valuation,instrument,startup:startup_id(name,sector,hq_location)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }
      setRows((data as any) ?? []);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [
        r.startup?.name ?? "",
        r.startup?.sector ?? "",
        r.startup?.hq_location ?? "",
        r.status ?? "",
        r.round_type ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">Deals</div>
          <div className="text-sm text-black/60">What you see is automatically filtered by your role and deal status.</div>
        </div>
        <div className="w-full max-w-sm">
          <Input placeholder="Search deals…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((d) => (
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
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-xs text-black/70">
                  <div>
                    <div className="text-black/40">Round</div>
                    <div className="mt-0.5">{d.round_type ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Instrument</div>
                    <div className="mt-0.5">{d.instrument ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Target</div>
                    <div className="mt-0.5">{formatMoney(d.target_amount as any)}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Min Ticket</div>
                    <div className="mt-0.5">{formatMoney(d.min_ticket as any)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-black/60">No deals available for your role yet.</div>
      ) : null}
    </div>
  );
}
