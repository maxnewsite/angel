"use client";
import { useMemo } from "react";
import { Badge } from "@/components/ui/Badge";

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

export default function SectorChart({ data }: { data: SectorData[] }) {
  const maxDeals = useMemo(() => {
    return Math.max(...data.map((s) => s.total_deals), 1);
  }, [data]);

  const getSectorColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-cyan-500",
    ];
    return colors[index % colors.length];
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 50) return "text-green-600";
    if (rate >= 25) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {data.slice(0, 10).map((sector, index) => {
          const widthPercent = (sector.total_deals / maxDeals) * 100;
          const publishedPercent = sector.total_deals > 0
            ? (sector.deals_published / sector.total_deals) * 100
            : 0;

          return (
            <div key={sector.sector} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 truncate max-w-xs">
                  {sector.sector || "Not specified"}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">
                    {sector.total_deals} deals
                  </span>
                  <Badge
                    variant="outline"
                    className={`${getSuccessColor(sector.publish_rate)} border-current`}
                  >
                    {sector.publish_rate}% success
                  </Badge>
                </div>
              </div>

              {/* Stacked Bar */}
              <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                {/* Total deals bar */}
                <div
                  className={`absolute h-full ${getSectorColor(index)} opacity-30`}
                  style={{ width: `${widthPercent}%` }}
                />

                {/* Published deals bar */}
                <div
                  className={`absolute h-full ${getSectorColor(index)}`}
                  style={{ width: `${(widthPercent * publishedPercent) / 100}%` }}
                />

                {/* Label inside bar */}
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-xs font-semibold text-white drop-shadow">
                    {sector.deals_published} published
                  </span>
                </div>
              </div>

              {/* Score comparison */}
              {(sector.avg_score_published_deals || sector.avg_score_rejected_deals) && (
                <div className="flex items-center gap-4 text-xs text-gray-500 ml-2">
                  {sector.avg_score_published_deals && (
                    <span className="text-green-600">
                      ✓ Avg published score: {sector.avg_score_published_deals}
                    </span>
                  )}
                  {sector.avg_score_rejected_deals && (
                    <span className="text-red-600">
                      ✗ Avg rejected score: {sector.avg_score_rejected_deals}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 pt-4 border-t text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Published Deals</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 opacity-30 rounded"></div>
          <span>Total Deals</span>
        </div>
      </div>
    </div>
  );
}
