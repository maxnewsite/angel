"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart,
} from "lucide-react";
import WaterfallChart from "@/components/analytics/WaterfallChart";
import SectorChart from "@/components/analytics/SectorChart";
import MonthlyTrendsChart from "@/components/analytics/MonthlyTrendsChart";

type WaterfallStats = {
  total_deals_received: number;
  deals_in_screening: number;
  deals_approved_to_ic: number;
  deals_in_ic_review: number;
  deals_ic_chair_recommended: number;
  deals_published: number;
  deals_screening_rejected: number;
  deals_ic_rejected: number;
  deals_archived: number;
  total_interest_amount: number;
  positive_interest_count: number;
  maybe_interest_count: number;
  deals_with_interest: number;
  deals_with_ic_yes_votes: number;
  avg_ic_confidence_on_yes: number;
  screening_approval_rate: number;
  ic_approval_rate: number;
  overall_conversion_rate: number;
  investor_interest_rate: number;
};

type KPI = {
  kpi_name: string;
  kpi_value: number;
  kpi_unit: string;
};

type SectorData = {
  sector: string;
  total_deals: number;
  deals_published: number;
  deals_rejected_screening: number;
  deals_rejected_ic: number;
  avg_target_amount: number;
  avg_valuation: number;
  publish_rate: number;
  avg_score_published_deals: number;
  avg_score_rejected_deals: number;
};

type MonthlyTrend = {
  month: string;
  deals_submitted: number;
  deals_passed_screening: number;
  deals_published: number;
  screening_pass_rate: number;
  overall_conversion_rate: number;
  avg_target_amount: number;
  total_capital_sought: number;
  total_interest_amount: number;
};

type ICMemberPerformance = {
  ic_member_id: string;
  ic_member_name: string;
  total_votes: number;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
  yes_vote_percentage: number;
  avg_confidence_yes: number;
  avg_confidence_no: number;
  avg_confidence_overall: number;
  votes_aligned_with_chair: number;
  participation_rate: number;
};

export default function AnalyticsPage() {
  const [waterfallStats, setWaterfallStats] = useState<WaterfallStats | null>(null);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [icPerformance, setICPerformance] = useState<ICMemberPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Load waterfall stats
      const { data: waterfallData, error: waterfallError } = await supabase
        .from("dealflow_waterfall_stats")
        .select("*")
        .single();

      if (waterfallError) {
        console.error("Waterfall stats error:", waterfallError);
      } else {
        setWaterfallStats(waterfallData);
      }

      // Load KPIs
      const { data: kpiData, error: kpiError } = await supabase
        .rpc("get_dealflow_kpis");

      if (kpiError) {
        console.error("KPIs error:", kpiError);
      } else {
        setKpis(kpiData || []);
      }

      // Load sector analytics
      const { data: sectorDataResult, error: sectorError } = await supabase
        .from("sector_analytics")
        .select("*")
        .order("total_deals", { ascending: false });

      if (sectorError) {
        console.error("Sector analytics error:", sectorError);
      } else {
        setSectorData(sectorDataResult || []);
      }

      // Load monthly trends
      const { data: trendsData, error: trendsError } = await supabase
        .from("monthly_dealflow_trends")
        .select("*")
        .order("month", { ascending: false })
        .limit(12);

      if (trendsError) {
        console.error("Monthly trends error:", trendsError);
      } else {
        setMonthlyTrends(trendsData || []);
      }

      // Load IC member performance
      const { data: icData, error: icError } = await supabase
        .from("ic_member_performance")
        .select("*")
        .order("total_votes", { ascending: false });

      if (icError) {
        console.error("IC performance error:", icError);
      } else {
        setICPerformance(icData || []);
      }
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dealflow Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive pipeline metrics and performance insights</p>
        </div>
        <Badge variant="outline" className="text-sm">
  	  <BarChart3 className="w-4 h-4 mr-2" />
  	  Real-time Data
	</Badge>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.kpi_name} className="bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                {kpi.kpi_name}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {kpi.kpi_unit === 'USD' ? formatMoney(kpi.kpi_value) : kpi.kpi_value.toFixed(2)}
                </p>
                <span className="text-xs text-gray-500">{kpi.kpi_unit !== 'USD' ? kpi.kpi_unit : ''}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dealflow Waterfall Chart */}
      {waterfallStats && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Dealflow Waterfall</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Pipeline conversion from initial submission to investor interest
            </p>
          </CardHeader>
          <CardContent>
            <WaterfallChart stats={waterfallStats} />

            {/* Conversion Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Screening Approval</p>
                <p className="text-3xl font-bold text-green-600">
                  {waterfallStats.screening_approval_rate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">IC Approval</p>
                <p className="text-3xl font-bold text-blue-600">
                  {waterfallStats.ic_approval_rate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Overall Conversion</p>
                <p className="text-3xl font-bold text-purple-600">
                  {waterfallStats.overall_conversion_rate}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Investor Interest</p>
                <p className="text-3xl font-bold text-orange-600">
                  {waterfallStats.investor_interest_rate}%
                </p>
              </div>
            </div>

            {/* Interest Amount */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Total Investor Interest Collected</p>
                  <p className="text-xs text-green-600 mt-1">
                    From {waterfallStats.positive_interest_count} positive signals on {waterfallStats.deals_with_interest} deals
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-700">
                    {formatMoney(waterfallStats.total_interest_amount)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    + {waterfallStats.maybe_interest_count} maybe signals
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sector Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Sector Performance</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">Deal distribution and success rates by sector</p>
        </CardHeader>
        <CardContent>
          <SectorChart data={sectorData} />

          {/* Sector Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Sector</th>
                  <th className="text-center p-3 font-semibold">Total Deals</th>
                  <th className="text-center p-3 font-semibold">Published</th>
                  <th className="text-center p-3 font-semibold">Success Rate</th>
                  <th className="text-right p-3 font-semibold">Avg Target</th>
                  <th className="text-right p-3 font-semibold">Avg Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sectorData.map((sector) => (
                  <tr key={sector.sector} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{sector.sector || "Not specified"}</td>
                    <td className="text-center p-3">{sector.total_deals}</td>
                    <td className="text-center p-3">
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {sector.deals_published}
                      </Badge>
                    </td>
                    <td className="text-center p-3">
                      <span className={`font-semibold ${sector.publish_rate >= 50 ? 'text-green-600' : sector.publish_rate >= 25 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {sector.publish_rate}%
                      </span>
                    </td>
                    <td className="text-right p-3">{formatMoney(sector.avg_target_amount)}</td>
                    <td className="text-right p-3">{formatMoney(sector.avg_valuation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold">Monthly Dealflow Trends</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">Volume and conversion trends over time</p>
        </CardHeader>
        <CardContent>
          <MonthlyTrendsChart data={monthlyTrends} />

          {/* Trends Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Month</th>
                  <th className="text-center p-3 font-semibold">Submitted</th>
                  <th className="text-center p-3 font-semibold">Passed Screening</th>
                  <th className="text-center p-3 font-semibold">Published</th>
                  <th className="text-center p-3 font-semibold">Conversion</th>
                  <th className="text-right p-3 font-semibold">Capital Sought</th>
                  <th className="text-right p-3 font-semibold">Interest Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthlyTrends.map((trend) => (
                  <tr key={trend.month} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">
                      {new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="text-center p-3">{trend.deals_submitted}</td>
                    <td className="text-center p-3">{trend.deals_passed_screening}</td>
                    <td className="text-center p-3">
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {trend.deals_published}
                      </Badge>
                    </td>
                    <td className="text-center p-3">
                      <span className={`font-semibold ${trend.overall_conversion_rate >= 20 ? 'text-green-600' : trend.overall_conversion_rate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {trend.overall_conversion_rate}%
                      </span>
                    </td>
                    <td className="text-right p-3">{formatMoney(trend.total_capital_sought)}</td>
                    <td className="text-right p-3 font-semibold text-green-700">
                      {formatMoney(trend.total_interest_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* IC Member Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold">IC Member Performance</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">Voting patterns and participation metrics</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">IC Member</th>
                  <th className="text-center p-3 font-semibold">Total Votes</th>
                  <th className="text-center p-3 font-semibold">Yes</th>
                  <th className="text-center p-3 font-semibold">No</th>
                  <th className="text-center p-3 font-semibold">Abstain</th>
                  <th className="text-center p-3 font-semibold">Yes %</th>
                  <th className="text-center p-3 font-semibold">Avg Confidence</th>
                  <th className="text-center p-3 font-semibold">Chair Alignment</th>
                  <th className="text-center p-3 font-semibold">Participation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {icPerformance.map((member) => (
                  <tr key={member.ic_member_id} className="hover:bg-gray-50">
                    <td className="p-3 font-medium">{member.ic_member_name}</td>
                    <td className="text-center p-3">{member.total_votes}</td>
                    <td className="text-center p-3">
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {member.yes_votes}
                      </Badge>
                    </td>
                    <td className="text-center p-3">
                      <Badge variant="outline" className="text-red-700 border-red-300">
                        {member.no_votes}
                      </Badge>
                    </td>
                    <td className="text-center p-3">
                      <Badge variant="outline" className="text-gray-700 border-gray-300">
                        {member.abstain_votes}
                      </Badge>
                    </td>
                    <td className="text-center p-3 font-semibold">
                      {member.yes_vote_percentage}%
                    </td>
                    <td className="text-center p-3">
                      {member.avg_confidence_overall?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="text-center p-3">
                      {member.votes_aligned_with_chair}/{member.total_votes}
                    </td>
                    <td className="text-center p-3">
                      <span className={`font-semibold ${member.participation_rate >= 80 ? 'text-green-600' : member.participation_rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {member.participation_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
