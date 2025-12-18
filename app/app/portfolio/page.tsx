"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils";
import {
  FileText,
  MessageSquare,
  Eye,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  MinusCircle,
  Calendar
} from "lucide-react";

type Deal = any;
type Interest = any;
type PortfolioDealData = {
  id: string;
  startup_name: string;
  sector: string;
  status: string;
  screening_score: number | null;
  ic_yes_votes: number;
  ic_no_votes: number;
  ic_abstain_votes: number;
  target_amount: number;
  valuation: number;
  total_interest: number;
  yes_interest_count: number;
  yes_interest_amount: number;
  updated_at: string;
  document_count: number;
};

export default function Portfolio() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [recapData, setRecapData] = useState<PortfolioDealData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, [showRejected]);

  async function loadPortfolio() {
    try {
      // Build query based on filter
      let query = supabase
        .from("deals")
        .select(`
          id,
          status,
          round_type,
          target_amount,
          min_ticket,
          valuation,
          instrument,
          created_at,
          published_at,
          updated_at,
          startup:startup_id(id,name,sector,hq_location,description),
          interests(
            id,
            signal,
            indicative_ticket,
            note,
            updated_at,
            investor_user_id,
            investor:investor_user_id(id,full_name,email)
          ),
          ic_decisions(id,decision,rationale,decided_at,chair_user_id,chair:chair_user_id(full_name,email))
        `);

      // Apply status filter
      if (showRejected) {
        query = query.in("status", ["published", "screening_rejected", "ic_rejected"]);
      } else {
        query = query.eq("status", "published");
      }

      const { data, error } = await query.order("published_at", { ascending: false });

      if (error) throw error;

      setDeals(data || []);

      // Load recap data with additional analytics
      await loadRecapData(data || []);
    } catch (e) {
      console.error("Failed to load portfolio:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecapData(deals: Deal[]) {
    const dealIds = deals.map(d => d.id);
    if (dealIds.length === 0) {
      setRecapData([]);
      return;
    }

    try {
      // Fetch screening scores
      const { data: screeningData } = await supabase
        .from("screening_reviews")
        .select("deal_id, overall_score")
        .in("deal_id", dealIds);

      // Fetch IC votes
      const { data: icVotesData } = await supabase
        .from("ic_votes")
        .select("deal_id, vote")
        .in("deal_id", dealIds);

      // Fetch document counts
      const { data: documentsData } = await supabase
        .from("documents")
        .select("deal_id")
        .in("deal_id", dealIds);

      // Build recap data
      const recap: PortfolioDealData[] = deals.map(deal => {
        // Get screening score (average if multiple)
        const scores = screeningData?.filter(s => s.deal_id === deal.id) || [];
        const avgScore = scores.length > 0
          ? scores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / scores.length
          : null;

        // Count IC votes
        const votes = icVotesData?.filter(v => v.deal_id === deal.id) || [];
        const yesVotes = votes.filter(v => v.vote === 'yes').length;
        const noVotes = votes.filter(v => v.vote === 'no').length;
        const abstainVotes = votes.filter(v => v.vote === 'abstain').length;

        // Interest metrics
        const interests = deal.interests || [];
        const yesInterests = interests.filter((i: Interest) => i.signal === "yes");
        const yesAmount = yesInterests.reduce(
          (sum: number, i: Interest) => sum + (i.indicative_ticket || 0),
          0
        );

        // Document count
        const docCount = documentsData?.filter(d => d.deal_id === deal.id).length || 0;

        return {
          id: deal.id,
          startup_name: deal.startup?.name || "Unknown",
          sector: deal.startup?.sector || "—",
          status: deal.status,
          screening_score: avgScore,
          ic_yes_votes: yesVotes,
          ic_no_votes: noVotes,
          ic_abstain_votes: abstainVotes,
          target_amount: deal.target_amount || 0,
          valuation: deal.valuation || 0,
          total_interest: interests.length,
          yes_interest_count: yesInterests.length,
          yes_interest_amount: yesAmount,
          updated_at: deal.updated_at || deal.published_at,
          document_count: docCount,
        };
      });

      setRecapData(recap);
    } catch (e) {
      console.error("Failed to load recap data:", e);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-2xl font-semibold">Portfolio</div>
        <div className="text-sm text-black/60">Loading published deals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">Portfolio</div>
          <div className="text-sm text-black/60">
            {showRejected
              ? `All deals (published and rejected) • ${deals.length} total`
              : `Published deals with investor interest tracking • ${deals.length} active`}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showRejected}
              onChange={(e) => setShowRejected(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none">
              Show rejected deals
            </span>
          </label>
          <Badge
            variant="outline"
            className={`text-xs ${
              showRejected ? "bg-orange-50 text-orange-700 border-orange-300" : "bg-green-50 text-green-700 border-green-300"
            }`}
          >
            {showRejected ? "All Deals" : "Published Only"}
          </Badge>
        </div>
      </div>

      {deals.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-sm text-black/60 py-8 text-center">
              No published deals yet. Deals appear here after IC chair approval.
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Portfolio Recap Table */}
          <PortfolioRecapTable data={recapData} />

          {/* Individual Deal Cards */}
          <div className="space-y-4">
            <div className="text-lg font-semibold text-black/80">Deal Details</div>
            {deals.map((deal) => (
              <DealPortfolioCard
                key={deal.id}
                deal={deal}
                expanded={expandedDeal === deal.id}
                onToggle={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PortfolioRecapTable({ data }: { data: PortfolioDealData[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Portfolio Overview</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Summary of all published deals with key metrics and investor activity
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Deal Name</th>
                <th className="text-center p-3 font-semibold text-gray-700">Status</th>
                <th className="text-center p-3 font-semibold text-gray-700">Sector</th>
                <th className="text-center p-3 font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Screening
                  </div>
                </th>
                <th className="text-center p-3 font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    IC Votes
                  </div>
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="w-4 h-4" />
                    Investment
                  </div>
                </th>
                <th className="text-right p-3 font-semibold text-gray-700">Valuation</th>
                <th className="text-center p-3 font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    Interest
                  </div>
                </th>
                <th className="text-center p-3 font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Updated
                  </div>
                </th>
                <th className="text-center p-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((deal) => {
                const isRejected = deal.status === "screening_rejected" || deal.status === "ic_rejected";
                const rowClasses = isRejected
                  ? "hover:bg-red-50/50 transition-colors bg-red-50/20"
                  : "hover:bg-gray-50 transition-colors";

                return (
                  <tr key={deal.id} className={rowClasses}>
                    {/* Deal Name */}
                    <td className="p-3">
                      <Link
                        href={`/app/deals/${deal.id}`}
                        className={`font-medium hover:underline ${
                          isRejected ? "text-red-600 hover:text-red-800" : "text-blue-600 hover:text-blue-800"
                        }`}
                      >
                        {deal.startup_name}
                      </Link>
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          deal.status === "published"
                            ? "bg-green-50 text-green-700 border-green-300"
                            : deal.status === "screening_rejected"
                            ? "bg-red-50 text-red-700 border-red-300"
                            : deal.status === "ic_rejected"
                            ? "bg-orange-50 text-orange-700 border-orange-300"
                            : "bg-gray-50 text-gray-700 border-gray-300"
                        }`}
                      >
                        {deal.status === "published"
                          ? "Published"
                          : deal.status === "screening_rejected"
                          ? "Screening ✗"
                          : deal.status === "ic_rejected"
                          ? "IC Rejected"
                          : deal.status}
                      </Badge>
                    </td>

                    {/* Sector */}
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {deal.sector}
                      </Badge>
                    </td>

                  {/* Screening Score */}
                  <td className="p-3 text-center">
                    {deal.screening_score !== null ? (
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`font-semibold ${
                            deal.screening_score >= 4
                              ? "text-green-600"
                              : deal.screening_score >= 3
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {deal.screening_score.toFixed(1)}
                        </span>
                        <span className="text-gray-400 text-xs">/5</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* IC Votes */}
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      {deal.ic_yes_votes > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 font-semibold">{deal.ic_yes_votes}</span>
                        </div>
                      )}
                      {deal.ic_no_votes > 0 && (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-red-700 font-semibold">{deal.ic_no_votes}</span>
                        </div>
                      )}
                      {deal.ic_abstain_votes > 0 && (
                        <div className="flex items-center gap-1">
                          <MinusCircle className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600 font-semibold">{deal.ic_abstain_votes}</span>
                        </div>
                      )}
                      {deal.ic_yes_votes === 0 && deal.ic_no_votes === 0 && deal.ic_abstain_votes === 0 && (
                        <span className="text-gray-400">No votes</span>
                      )}
                    </div>
                  </td>

                  {/* Investment Request */}
                  <td className="p-3 text-right font-medium text-gray-900">
                    {formatMoney(deal.target_amount)}
                  </td>

                  {/* Valuation */}
                  <td className="p-3 text-right text-gray-700">
                    {formatMoney(deal.valuation)}
                  </td>

                  {/* Investor Interest */}
                  <td className="p-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            deal.yes_interest_count > 0
                              ? "bg-green-50 text-green-700 border-green-300"
                              : "bg-gray-50 text-gray-600 border-gray-300"
                          }`}
                        >
                          {deal.yes_interest_count} yes
                        </Badge>
                      </div>
                      {deal.yes_interest_amount > 0 && (
                        <span className="text-xs font-semibold text-green-700">
                          {formatMoney(deal.yes_interest_amount)}
                        </span>
                      )}
                      {deal.total_interest > deal.yes_interest_count && (
                        <span className="text-xs text-gray-500">
                          +{deal.total_interest - deal.yes_interest_count} other
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Last Updated */}
                  <td className="p-3 text-center text-xs text-gray-600">
                    {new Date(deal.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/app/deals/${deal.id}`}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                        title="View Deal"
                      >
                        <Eye className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                      </Link>
                      <Link
                        href={`/app/deals/${deal.id}#documents`}
                        className="p-2 hover:bg-purple-50 rounded-lg transition-colors group relative"
                        title="View Documents"
                      >
                        <FileText className="w-4 h-4 text-gray-600 group-hover:text-purple-600" />
                        {deal.document_count > 0 && (
                          <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {deal.document_count}
                          </span>
                        )}
                      </Link>
                      <Link
                        href={`/app/deals/${deal.id}#comments`}
                        className="p-2 hover:bg-green-50 rounded-lg transition-colors group"
                        title="Add Comment"
                      >
                        <MessageSquare className="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* Summary Row */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Deal Status Breakdown */}
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700 uppercase tracking-wide mb-1">Total Deals</p>
              <p className="text-lg font-bold text-gray-900">{data.length}</p>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-green-700 uppercase tracking-wide mb-1">Published</p>
              <p className="text-lg font-bold text-green-900">
                {data.filter((d) => d.status === "published").length}
              </p>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-700 uppercase tracking-wide mb-1">Rejected</p>
              <p className="text-lg font-bold text-red-900">
                {data.filter((d) => d.status === "screening_rejected" || d.status === "ic_rejected").length}
              </p>
            </div>

            {/* Financial Metrics */}
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">Total Target</p>
              <p className="text-lg font-bold text-blue-900">
                {formatMoney(data.filter((d) => d.status === "published").reduce((sum, d) => sum + d.target_amount, 0))}
              </p>
              <p className="text-xs text-blue-600 mt-1">published deals</p>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700 uppercase tracking-wide mb-1">Total Interest</p>
              <p className="text-lg font-bold text-purple-900">
                {formatMoney(data.reduce((sum, d) => sum + d.yes_interest_amount, 0))}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {data.reduce((sum, d) => sum + d.yes_interest_count, 0)} investors
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DealPortfolioCard({
  deal,
  expanded,
  onToggle,
}: {
  deal: Deal;
  expanded: boolean;
  onToggle: () => void;
}) {
  const interests = deal.interests || [];

  // Categorize interests
  const yesInterests = interests.filter((i: Interest) => i.signal === "yes");
  const maybeInterests = interests.filter((i: Interest) => i.signal === "maybe");
  const noInterests = interests.filter((i: Interest) => i.signal === "no");

  // Calculate total indicated capital
  const totalYesCapital = yesInterests.reduce(
    (sum: number, i: Interest) => sum + (i.indicative_ticket || 0),
    0
  );
  const totalMaybeCapital = maybeInterests.reduce(
    (sum: number, i: Interest) => sum + (i.indicative_ticket || 0),
    0
  );

  // Calculate progress toward target
  const targetProgress = deal.target_amount
    ? Math.round((totalYesCapital / deal.target_amount) * 100)
    : 0;

  const isRejected = deal.status === "screening_rejected" || deal.status === "ic_rejected";

  return (
    <Card className={isRejected ? "border-red-200 bg-red-50/10" : ""}>
      <CardHeader>
        <div className="space-y-3">
          {/* Deal Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold">{deal.startup?.name || "Startup"}</div>
                <Badge
                  className={
                    deal.status === "published"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : deal.status === "screening_rejected"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : deal.status === "ic_rejected"
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }
                >
                  {deal.status === "published"
                    ? "Published"
                    : deal.status === "screening_rejected"
                    ? "Screening Rejected"
                    : deal.status === "ic_rejected"
                    ? "IC Rejected"
                    : deal.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-black/60">
                {deal.startup?.sector || "—"} • {deal.startup?.hq_location || "—"} •{" "}
                {deal.round_type || "—"} • {formatMoney(deal.target_amount)} target
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-sm text-black/60 hover:text-black transition"
            >
              {expanded ? "▼ Hide details" : "▶ Show details"}
            </button>
          </div>

          {/* Rejection Notice for rejected deals */}
          {isRejected && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-900">
                    {deal.status === "screening_rejected"
                      ? "Rejected at Screening Stage"
                      : "Rejected by Investment Committee"}
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    This deal did not pass the required evaluation criteria and is no longer active in the pipeline.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Interest Summary - Only show for published deals */}
          {!isRejected && (
            <div className="grid grid-cols-4 gap-3">
            {/* Total Interest */}
            <div className="rounded-xl border border-black/10 bg-gradient-to-br from-purple-50/50 to-blue-50/50 p-3">
              <div className="text-xs text-black/60">Total Interest</div>
              <div className="mt-1 text-2xl font-semibold">{interests.length}</div>
              <div className="text-xs text-black/50 mt-0.5">investors</div>
            </div>

            {/* Yes Interest */}
            <div className="rounded-xl border border-green-200 bg-green-50/50 p-3">
              <div className="text-xs text-green-700/80 font-medium">✓ Yes</div>
              <div className="mt-1 text-2xl font-semibold text-green-900">
                {yesInterests.length}
              </div>
              <div className="text-xs text-green-700/70 mt-0.5">
                {formatMoney(totalYesCapital)} indicated
              </div>
            </div>

            {/* Maybe Interest */}
            <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-3">
              <div className="text-xs text-yellow-700/80 font-medium">? Maybe</div>
              <div className="mt-1 text-2xl font-semibold text-yellow-900">
                {maybeInterests.length}
              </div>
              <div className="text-xs text-yellow-700/70 mt-0.5">
                {formatMoney(totalMaybeCapital)} indicated
              </div>
            </div>

            {/* No Interest */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
              <div className="text-xs text-red-700/80 font-medium">✗ No</div>
              <div className="mt-1 text-2xl font-semibold text-red-900">
                {noInterests.length}
              </div>
              <div className="text-xs text-red-700/70 mt-0.5">passed</div>
            </div>
          </div>
          )}

          {/* Target Progress Bar - Only for published deals */}
          {!isRejected && deal.target_amount && totalYesCapital > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-black/60 mb-1">
                <span>Target Progress</span>
                <span className="font-medium">
                  {formatMoney(totalYesCapital)} / {formatMoney(deal.target_amount)} ({targetProgress}%)
                </span>
              </div>
              <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                  style={{ width: `${Math.min(targetProgress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          <div className="space-y-6">
            {/* Deal Information */}
            <div>
              <div className="text-xs font-semibold text-black/70 mb-3">📋 Deal Information</div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-black/50">Round</div>
                  <div className="font-medium mt-0.5">{deal.round_type || "—"}</div>
                </div>
                <div>
                  <div className="text-black/50">Instrument</div>
                  <div className="font-medium mt-0.5">{deal.instrument || "—"}</div>
                </div>
                <div>
                  <div className="text-black/50">Valuation</div>
                  <div className="font-medium mt-0.5">{formatMoney(deal.valuation)}</div>
                </div>
                <div>
                  <div className="text-black/50">Target</div>
                  <div className="font-medium mt-0.5">{formatMoney(deal.target_amount)}</div>
                </div>
                <div>
                  <div className="text-black/50">Min Ticket</div>
                  <div className="font-medium mt-0.5">{formatMoney(deal.min_ticket)}</div>
                </div>
                <div>
                  <div className="text-black/50">Published</div>
                  <div className="font-medium mt-0.5">
                    {deal.published_at
                      ? new Date(deal.published_at).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* IC Decision */}
            {deal.ic_decisions && deal.ic_decisions.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-black/70 mb-3">
                  ✅ IC Chair Decision
                </div>
                <div className="rounded-xl border border-black/10 bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-50 text-green-700 border-green-200">
                        {deal.ic_decisions[0].decision}
                      </Badge>
                      {deal.ic_decisions[0].chair && (
                        <span className="text-xs text-black/60">
                          by {deal.ic_decisions[0].chair.full_name || deal.ic_decisions[0].chair.email || 'IC Chair'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-black/50">
                      {new Date(deal.ic_decisions[0].decided_at).toLocaleDateString()}
                    </span>
                  </div>
                  {deal.ic_decisions[0].rationale && (
                    <div className="text-sm text-black/70">
                      {deal.ic_decisions[0].rationale}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Yes Interests */}
            {yesInterests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-black/70 mb-3">
                  🟢 Yes Interest ({yesInterests.length})
                </div>
                <div className="space-y-2">
                  {yesInterests.map((interest: Interest) => (
                    <InterestCard key={interest.id} interest={interest} type="yes" />
                  ))}
                </div>
              </div>
            )}

            {/* Maybe Interests */}
            {maybeInterests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-black/70 mb-3">
                  🟡 Maybe Interest ({maybeInterests.length})
                </div>
                <div className="space-y-2">
                  {maybeInterests.map((interest: Interest) => (
                    <InterestCard key={interest.id} interest={interest} type="maybe" />
                  ))}
                </div>
              </div>
            )}

            {/* No Interests */}
            {noInterests.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-black/70 mb-3">
                  🔴 Passed ({noInterests.length})
                </div>
                <div className="space-y-2">
                  {noInterests.map((interest: Interest) => (
                    <InterestCard key={interest.id} interest={interest} type="no" />
                  ))}
                </div>
              </div>
            )}

            {interests.length === 0 && (
              <div className="text-sm text-black/60 text-center py-6">
                No investor interest recorded yet
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function InterestCard({ interest, type }: { interest: Interest; type: "yes" | "maybe" | "no" }) {
  const colorClasses = {
    yes: "border-green-200 bg-green-50/50",
    maybe: "border-yellow-200 bg-yellow-50/50",
    no: "border-red-200 bg-red-50/50",
  };

  const textColorClasses = {
    yes: "text-green-900",
    maybe: "text-yellow-900",
    no: "text-red-900",
  };

  // Display investor full name or email
  const investorName = interest.investor?.full_name || interest.investor?.email || `Investor ${interest.investor_user_id.slice(0, 8)}...`;
  const investorEmail = interest.investor?.email;

  return (
    <div className={`rounded-xl border ${colorClasses[type]} p-3`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className={`text-sm font-medium ${textColorClasses[type]}`}>
            {investorName}
          </div>
          {investorEmail && interest.investor?.full_name && (
            <div className="text-xs text-black/60 mt-0.5">
              {investorEmail}
            </div>
          )}
        </div>
        <div className="text-right">
          {interest.indicative_ticket && (
            <div className={`text-sm font-semibold ${textColorClasses[type]}`}>
              {formatMoney(interest.indicative_ticket)}
            </div>
          )}
          <div className="text-xs text-black/50 mt-0.5">
            {new Date(interest.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      {interest.note && (
        <div className="text-sm text-black/70 mt-2 pt-2 border-t border-black/10">
          {interest.note}
        </div>
      )}
    </div>
  );
}
