"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils";

type RejectedDeal = {
  id: string;
  startup: {
    name: string;
    sector: string;
    hq_location: string;
  };
  round_type: string;
  target_amount: number;
  valuation: number;
  screening_completed_at: string;
  report: {
    decided_at: string;
    decision_rationale: string;
    report_data: any;
  };
};

export default function RejectedDeals() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [deals, setDeals] = useState<RejectedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<RejectedDeal | null>(null);

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (!profile || !["dealflow_manager", "dealflow_analyst", "ic_member", "ic_chair", "admin"].includes(profile.role)) {
        alert("Access denied. Only internal roles can view rejected deals.");
        router.push("/app");
        return;
      }

      setRole(profile.role);

      // Fetch rejected deals with reports
      const { data: rejectedDeals, error } = await supabase
        .from("deals")
        .select(`
          id,
          startup:startup_id(name,sector,hq_location),
          round_type,
          target_amount,
          valuation,
          screening_completed_at,
          screening_reports!inner(decided_at,decision_rationale,report_data,report_type)
        `)
        .eq("screening_decision", "rejected")
        .eq("screening_reports.report_type", "rejected")
        .order("screening_completed_at", { ascending: false });

      if (error) {
        console.error("Error loading rejected deals:", error);
      } else {
        // Transform data
        const transformed = (rejectedDeals || []).map((d: any) => ({
          id: d.id,
          startup: d.startup,
          round_type: d.round_type,
          target_amount: d.target_amount,
          valuation: d.valuation,
          screening_completed_at: d.screening_completed_at,
          report: d.screening_reports[0],
        }));
        setDeals(transformed);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return <div className="text-sm text-black/60">Loading rejected deals...</div>;
  }

  if (!role) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-semibold">Rejected Deals</div>
        <div className="text-sm text-black/60">
          Archive of deals rejected during screening. {deals.length} total.
        </div>
      </div>

      {deals.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-12 text-center text-sm text-black/60">
              No rejected deals yet.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deals.map((deal) => (
            <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader onClick={() => setSelectedDeal(deal)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{deal.startup?.name || "Unknown Startup"}</div>
                    <div className="mt-1 text-xs text-black/60">
                      {deal.startup?.sector || "—"} • {deal.startup?.hq_location || "—"}
                    </div>
                  </div>
                  <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-black/40">Round</div>
                    <div className="mt-0.5">{deal.round_type || "—"}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Target</div>
                    <div className="mt-0.5">{formatMoney(deal.target_amount)}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Rejected</div>
                    <div className="mt-0.5">
                      {new Date(deal.screening_completed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDeal(deal);
                    }}
                    className="text-xs text-black/60 hover:text-black"
                  >
                    View screening report →
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="text-2xl font-semibold">
                  {selectedDeal.report.report_data?.deal?.startup_name}
                </div>
                <div className="mt-1 text-sm text-black/60">
                  Rejected on {new Date(selectedDeal.report.decided_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedDeal(null)}
                className="text-black/40 hover:text-black text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Deal Overview */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Deal Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-black/40">Sector</div>
                    <div>{selectedDeal.report.report_data?.deal?.sector || "—"}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Location</div>
                    <div>{selectedDeal.report.report_data?.deal?.hq_location || "—"}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Round</div>
                    <div>{selectedDeal.report.report_data?.deal?.round_type || "—"}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Target</div>
                    <div>{formatMoney(selectedDeal.report.report_data?.deal?.target_amount)}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Valuation</div>
                    <div>{formatMoney(selectedDeal.report.report_data?.deal?.valuation)}</div>
                  </div>
                  <div>
                    <div className="text-black/40">Instrument</div>
                    <div>{selectedDeal.report.report_data?.deal?.instrument || "—"}</div>
                  </div>
                </div>
              </section>

              {/* Screening Score */}
              <section>
                <h3 className="text-lg font-semibold mb-3">Screening Analysis</h3>
                <div className="rounded-lg bg-black/5 p-4">
                  <div className="text-sm text-black/60">Overall Score</div>
                  <div className="text-3xl font-bold">
                    {selectedDeal.report.report_data?.screening?.overall_score || "—"} / 5.0
                  </div>
                </div>
              </section>

              {/* Flags */}
              {(selectedDeal.report.report_data?.flags?.red_flags?.length > 0 ||
                selectedDeal.report.report_data?.flags?.green_flags?.length > 0) && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Red/Green Flags</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Red Flags */}
                    {selectedDeal.report.report_data?.flags?.red_flags?.length > 0 && (
                      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                        <div className="mb-2 font-semibold text-red-900">
                          🔴 Red Flags ({selectedDeal.report.report_data.flags.red_flags.length})
                        </div>
                        <div className="space-y-2">
                          {selectedDeal.report.report_data.flags.red_flags.map((flag: any, i: number) => (
                            <div key={i} className="text-sm">
                              <div className="font-medium">{flag.flag}</div>
                              <div className="text-xs text-black/60">{flag.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Green Flags */}
                    {selectedDeal.report.report_data?.flags?.green_flags?.length > 0 && (
                      <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                        <div className="mb-2 font-semibold text-green-900">
                          🟢 Green Flags ({selectedDeal.report.report_data.flags.green_flags.length})
                        </div>
                        <div className="space-y-2">
                          {selectedDeal.report.report_data.flags.green_flags.map((flag: any, i: number) => (
                            <div key={i} className="text-sm">
                              <div className="font-medium">{flag.flag}</div>
                              <div className="text-xs text-black/60">{flag.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Decision Rationale */}
              {selectedDeal.report.decision_rationale && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Decision Rationale</h3>
                  <div className="rounded-lg bg-black/5 p-4 text-sm whitespace-pre-wrap">
                    {selectedDeal.report.decision_rationale}
                  </div>
                </section>
              )}

              {/* Criteria Scores */}
              {selectedDeal.report.report_data?.screening?.scores?.length > 0 && (
                <section>
                  <h3 className="text-lg font-semibold mb-3">Detailed Scores</h3>
                  <div className="space-y-3">
                    {selectedDeal.report.report_data.screening.scores.map((score: any, i: number) => (
                      <div key={i} className="rounded-lg border border-black/10 bg-white p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{score.criterion?.name}</div>
                          <div className="text-sm font-semibold">{score.score}/5</div>
                        </div>
                        {score.note && (
                          <div className="text-xs text-black/60">{score.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedDeal(null)}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
