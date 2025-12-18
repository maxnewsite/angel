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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Loading timeout")), 10000)
        );

        const dataPromise = supabase
          .from("deals")
          .select("id,status,round_type,target_amount,min_ticket,valuation,instrument,startup:startup_id(name,sector,hq_location)")
          .order("created_at", { ascending: false });

        const { data, error } = await Promise.race([
          dataPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error("Deals load error:", error);
          setError("Failed to load deals. Please refresh the page.");
          setLoading(false);
          return;
        }

        setRows((data as any) ?? []);
        setLoading(false);
      } catch (e: any) {
        console.error("Deals load error:", e);
        setError("Failed to load deals. Please refresh the page.");
        setLoading(false);
      }
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-2xl font-semibold">Deals</div>
        <div className="text-sm text-black/60">Loading deals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-2xl font-semibold">Deals</div>
        <Card>
          <CardContent>
            <div className="py-8 text-center">
              <div className="text-sm text-red-600 mb-2">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-blue-600 hover:underline"
              >
                Refresh page
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {filtered.length === 0 && !loading ? (
        <div className="text-sm text-black/60">No deals available for your role yet.</div>
      ) : null}
    </div>
  );
}
