"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Eye, ThumbsUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayData {
  day: string;
  prompts: number;
  users: number;
}

interface CategoryData {
  name: string;
  count: number;
}

interface TypeData {
  type: string;
  count: number;
}

interface AnalyticsData {
  dailyData: DayData[];
  topCategories: CategoryData[];
  promptTypeBreakdown: TypeData[];
  totals: { votes: number; views: number };
}

// Mini sparkline using plain SVG — no extra dependency needed
function Sparkline({
  data,
  color,
  height = 48,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = height;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Horizontal bar chart for category / type breakdowns
function HorizontalBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 truncate text-muted-foreground text-xs">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-8 text-right text-xs font-medium">{count}</span>
    </div>
  );
}

// Grouped bar chart for daily data
function DailyBarChart({ data }: { data: DayData[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.prompts, d.users)), 1);
  const showEvery = Math.ceil(data.length / 6);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d, i) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end group relative">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
              <div className="bg-popover border rounded-md px-2 py-1 shadow-md text-xs whitespace-nowrap">
                <div className="font-medium">{d.day.slice(5)}</div>
                <div className="text-indigo-500">Prompts: {d.prompts}</div>
                <div className="text-emerald-500">Users: {d.users}</div>
              </div>
            </div>
            {/* Bars */}
            <div className="w-full flex gap-px items-end">
              <div
                className="flex-1 rounded-t bg-indigo-500/80 min-h-px transition-all"
                style={{ height: `${(d.prompts / maxVal) * 100}%` }}
              />
              <div
                className="flex-1 rounded-t bg-emerald-500/80 min-h-px transition-all"
                style={{ height: `${(d.users / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-0.5">
        {data.map((d, i) => (
          <div key={d.day} className="flex-1 text-center text-[9px] text-muted-foreground overflow-hidden">
            {i % showEvery === 0 ? d.day.slice(5) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  TEXT: "#6366f1",
  IMAGE: "#f59e0b",
  VIDEO: "#ef4444",
  AUDIO: "#10b981",
  SKILL: "#8b5cf6",
  TASTE: "#ec4899",
  STRUCTURED: "#0ea5e9",
};

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground text-sm">Failed to load analytics.</p>;

  const promptSeries = data.dailyData.map((d) => d.prompts);
  const userSeries = data.dailyData.map((d) => d.users);
  const totalNewPrompts = promptSeries.reduce((a, b) => a + b, 0);
  const totalNewUsers = userSeries.reduce((a, b) => a + b, 0);
  const maxCatCount = Math.max(...data.topCategories.map((c) => c.count), 1);
  const maxTypeCount = Math.max(...data.promptTypeBreakdown.map((t) => t.count), 1);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">New Prompts (30d)</span>
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold">{totalNewPrompts.toLocaleString()}</p>
            <div className="mt-2 h-10">
              <Sparkline data={promptSeries} color="#6366f1" height={40} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">New Users (30d)</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">{totalNewUsers.toLocaleString()}</p>
            <div className="mt-2 h-10">
              <Sparkline data={userSeries} color="#10b981" height={40} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total Views</span>
              <Eye className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <p className="text-2xl font-bold">{data.totals.views.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Total Votes</span>
              <ThumbsUp className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="text-2xl font-bold">{data.totals.votes.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily activity chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Daily Activity — Last 30 Days
          </CardTitle>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-indigo-500" /> Prompts</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" /> Users</span>
          </div>
        </CardHeader>
        <CardContent>
          <DailyBarChart data={data.dailyData} />
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top categories */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topCategories.length === 0 && (
              <p className="text-xs text-muted-foreground">No data yet.</p>
            )}
            {data.topCategories.map((c, i) => (
              <HorizontalBar
                key={c.name}
                label={c.name}
                count={c.count}
                max={maxCatCount}
                color={`hsl(${(i * 47) % 360}, 70%, 50%)`}
              />
            ))}
          </CardContent>
        </Card>

        {/* Prompt type breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prompt Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.promptTypeBreakdown.map((t) => (
              <HorizontalBar
                key={t.type}
                label={t.type}
                count={t.count}
                max={maxTypeCount}
                color={TYPE_COLORS[t.type] ?? "#6366f1"}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
