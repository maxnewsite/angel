"use client";
import { useMemo } from "react";
import { formatMoney } from "@/lib/utils";
import { ArrowRight, TrendingDown } from "lucide-react";

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

type WaterfallStage = {
  id: string;
  label: string;
  value: number;
  color: string;
  isDropOff?: boolean;
  amount?: number;
  description?: string;
};

export default function WaterfallChart({ stats }: { stats: WaterfallStats }) {
  const stages: WaterfallStage[] = useMemo(() => {
    return [
      {
        id: "received",
        label: "Deals Received",
        value: stats.total_deals_received,
        color: "bg-blue-500",
        description: "Total deals submitted to the platform",
      },
      {
        id: "screening_dropoff",
        label: "Screening Rejected",
        value: stats.deals_screening_rejected,
        color: "bg-red-300",
        isDropOff: true,
      },
      {
        id: "approved_to_ic",
        label: "Approved to IC",
        value: stats.deals_approved_to_ic,
        color: "bg-green-500",
        description: "Deals that passed screening evaluation",
      },
      {
        id: "ic_dropoff",
        label: "IC Rejected",
        value: stats.deals_ic_rejected,
        color: "bg-red-300",
        isDropOff: true,
      },
      {
        id: "ic_recommended",
        label: "IC Chair Recommended",
        value: stats.deals_ic_chair_recommended,
        color: "bg-purple-500",
        description: "Deals recommended by IC Chair",
      },
      {
        id: "published",
        label: "Published to Investors",
        value: stats.deals_published,
        color: "bg-indigo-600",
        description: "Deals available for investor syndication",
      },
      {
        id: "interest",
        label: "Investor Interest",
        value: stats.deals_with_interest,
        color: "bg-orange-500",
        amount: stats.total_interest_amount,
        description: `${stats.positive_interest_count} positive interest signals`,
      },
    ];
  }, [stats]);

  const maxValue = Math.max(...stages.map((s) => s.value));

  return (
    <div className="space-y-6">
      {/* Visual Waterfall */}
      <div className="relative">
        {stages.map((stage, index) => {
          const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          const prevStage = index > 0 ? stages[index - 1] : null;
          const conversionRate = prevStage && !prevStage.isDropOff && prevStage.value > 0
            ? ((stage.value / prevStage.value) * 100).toFixed(1)
            : null;

          return (
            <div key={stage.id} className="mb-4">
              {/* Stage Bar */}
              <div className="flex items-center gap-4">
                <div className="w-48 text-sm font-medium text-gray-700">
                  {stage.label}
                </div>

                <div className="flex-1 relative">
                  {/* Bar */}
                  <div
                    className={`${stage.color} ${stage.isDropOff ? 'opacity-50' : ''} h-12 rounded-lg transition-all duration-300 flex items-center justify-between px-4 shadow-sm hover:shadow-md`}
                    style={{ width: `${widthPercent}%`, minWidth: '80px' }}
                  >
                    <span className="text-white font-bold text-lg">
                      {stage.value}
                    </span>
                    {stage.amount !== undefined && (
                      <span className="text-white text-sm font-semibold">
                        {formatMoney(stage.amount)}
                      </span>
                    )}
                  </div>

                  {/* Conversion Rate Badge */}
                  {conversionRate && !stage.isDropOff && (
                    <div className="absolute -top-1 -right-2 bg-white border-2 border-green-500 rounded-full px-2 py-1 text-xs font-bold text-green-700 shadow-sm">
                      {conversionRate}%
                    </div>
                  )}
                </div>

                {/* Description */}
                {stage.description && (
                  <div className="w-64 text-xs text-gray-500">
                    {stage.description}
                  </div>
                )}
              </div>

              {/* Connection Arrow */}
              {index < stages.length - 1 && (
                <div className="flex items-center ml-48 mt-2 mb-2">
                  {stages[index + 1].isDropOff ? (
                    <div className="flex items-center gap-2 text-red-500 text-xs">
                      <TrendingDown className="w-4 h-4" />
                      <span>Drop-off</span>
                    </div>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">Total Deals</p>
          <p className="text-2xl font-bold text-blue-900">{stats.total_deals_received}</p>
        </div>

        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-xs text-green-700 uppercase tracking-wide mb-1">Published</p>
          <p className="text-2xl font-bold text-green-900">{stats.deals_published}</p>
          <p className="text-xs text-green-600 mt-1">{stats.overall_conversion_rate}% conversion</p>
        </div>

        <div className="text-center p-4 bg-red-50 rounded-lg">
          <p className="text-xs text-red-700 uppercase tracking-wide mb-1">Total Rejected</p>
          <p className="text-2xl font-bold text-red-900">
            {stats.deals_screening_rejected + stats.deals_ic_rejected}
          </p>
          <p className="text-xs text-red-600 mt-1">
            {stats.deals_screening_rejected} screening, {stats.deals_ic_rejected} IC
          </p>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-700 uppercase tracking-wide mb-1">In Progress</p>
          <p className="text-2xl font-bold text-purple-900">
            {stats.deals_in_screening + stats.deals_in_ic_review}
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {stats.deals_in_screening} screening, {stats.deals_in_ic_review} IC
          </p>
        </div>
      </div>
    </div>
  );
}
