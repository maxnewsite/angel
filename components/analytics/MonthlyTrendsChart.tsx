"use client";
import { useMemo } from "react";
import { formatMoney } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

export default function MonthlyTrendsChart({ data }: { data: MonthlyTrend[] }) {
  const maxSubmitted = useMemo(() => {
    return Math.max(...data.map((d) => d.deals_submitted), 1);
  }, [data]);

  const maxCapital = useMemo(() => {
    return Math.max(...data.map((d) => d.total_capital_sought), 1);
  }, [data]);

  const getTrendIcon = (current: number, previous: number | null) => {
    if (previous === null) return <Minus className="w-4 h-4 text-gray-400" />;
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (current: number, previous: number | null) => {
    if (previous === null) return "text-gray-600";
    if (current > previous) return "text-green-600";
    if (current < previous) return "text-red-600";
    return "text-gray-600";
  };

  // Reverse data to show oldest first (left to right)
  const chartData = useMemo(() => [...data].reverse(), [data]);

  return (
    <div className="space-y-6">
      {/* Dual-Axis Chart */}
      <div className="space-y-4">
        {chartData.map((trend, index) => {
          const submittedWidth = (trend.deals_submitted / maxSubmitted) * 100;
          const publishedWidth = (trend.deals_published / maxSubmitted) * 100;
          const capitalWidth = (trend.total_capital_sought / maxCapital) * 100;

          const prevTrend = index > 0 ? chartData[index - 1] : null;

          return (
            <div key={trend.month} className="space-y-2">
              {/* Month Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 w-20">
                    {new Date(trend.month).toLocaleDateString("en-US", {
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                  {getTrendIcon(trend.deals_submitted, prevTrend?.deals_submitted || null)}
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div className="text-right">
                    <p className="text-gray-500">Submitted</p>
                    <p className={`font-bold ${getTrendColor(trend.deals_submitted, prevTrend?.deals_submitted || null)}`}>
                      {trend.deals_submitted}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Published</p>
                    <p className="font-bold text-blue-600">{trend.deals_published}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Conversion</p>
                    <p className={`font-bold ${trend.overall_conversion_rate >= 20 ? 'text-green-600' : trend.overall_conversion_rate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {trend.overall_conversion_rate}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Deal Volume Bars */}
              <div className="space-y-1">
                {/* Submitted deals */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Submitted</span>
                  <div className="flex-1 relative h-6 bg-gray-100 rounded">
                    <div
                      className="absolute h-full bg-gray-400 rounded transition-all duration-300"
                      style={{ width: `${submittedWidth}%` }}
                    />
                  </div>
                </div>

                {/* Published deals */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-20">Published</span>
                  <div className="flex-1 relative h-6 bg-gray-100 rounded">
                    <div
                      className="absolute h-full bg-blue-500 rounded transition-all duration-300"
                      style={{ width: `${publishedWidth}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Capital Bar */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-20">Capital</span>
                <div className="flex-1 relative h-4 bg-gray-100 rounded">
                  <div
                    className="absolute h-full bg-green-500 rounded transition-all duration-300"
                    style={{ width: `${capitalWidth}%` }}
                  />
                </div>
                <span className="text-xs text-gray-700 font-medium w-32 text-right">
                  {formatMoney(trend.total_capital_sought)}
                </span>
              </div>

              {/* Interest Generated */}
              {trend.total_interest_amount > 0 && (
                <div className="flex items-center gap-2 pl-22">
                  <span className="text-xs text-green-700 font-medium">
                    💰 Interest: {formatMoney(trend.total_interest_amount)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Total Submitted</p>
          <p className="text-xl font-bold text-gray-900">
            {data.reduce((sum, d) => sum + d.deals_submitted, 0)}
          </p>
        </div>

        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 mb-1">Total Published</p>
          <p className="text-xl font-bold text-blue-900">
            {data.reduce((sum, d) => sum + d.deals_published, 0)}
          </p>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 mb-1">Total Capital</p>
          <p className="text-xl font-bold text-green-900">
            {formatMoney(data.reduce((sum, d) => sum + d.total_capital_sought, 0))}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span>Submitted</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Published</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Capital Sought</span>
        </div>
      </div>
    </div>
  );
}
