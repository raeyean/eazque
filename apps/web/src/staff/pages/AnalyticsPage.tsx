import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useStaffAuth } from "../StaffAuthContext";
import { useTodayStats } from "../hooks/useTodayStats";
import { useDateRangeStats } from "../hooks/useDateRangeStats";
import type { DailyStats } from "@eazque/shared";

type RangeType = "today" | "7days" | "30days" | "custom";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatBarDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatHour(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
}

function aggregateStats(statsByDate: DailyStats[]) {
  const totalJoined = statsByDate.reduce((s, d) => s + d.totalJoined, 0);
  const completedCount = statsByDate.reduce((s, d) => s + d.completedCount, 0);
  const skippedCount = statsByDate.reduce((s, d) => s + d.skippedCount, 0);
  const removedCount = statsByDate.reduce((s, d) => s + d.removedCount, 0);
  const totalServiceWeight = statsByDate.reduce(
    (s, d) => s + d.avgServiceTime * d.completedCount,
    0
  );
  const totalWaitWeight = statsByDate.reduce(
    (s, d) => s + d.avgWaitTime * d.completedCount,
    0
  );
  const avgServiceTime =
    completedCount > 0
      ? Math.round((totalServiceWeight / completedCount) * 10) / 10
      : 0;
  const avgWaitTime =
    completedCount > 0
      ? Math.round((totalWaitWeight / completedCount) * 10) / 10
      : 0;
  const hourlyDistribution: Record<string, number> = {};
  for (const d of statsByDate) {
    for (const [hour, count] of Object.entries(d.hourlyDistribution)) {
      hourlyDistribution[hour] = (hourlyDistribution[hour] ?? 0) + count;
    }
  }
  return { totalJoined, completedCount, skippedCount, removedCount, avgServiceTime, avgWaitTime, hourlyDistribution };
}

function getTop3Hours(distribution: Record<string, number>) {
  return Object.entries(distribution)
    .map(([h, count]) => ({ hour: Number(h), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

const RANGES: Array<{ key: RangeType; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7days", label: "7 Days" },
  { key: "30days", label: "30 Days" },
  { key: "custom", label: "Custom" },
];

export default function AnalyticsPage() {
  const { businessId } = useStaffAuth();
  const [range, setRange] = useState<RangeType>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeRange, setActiveRange] = useState({ start: "", end: "" });

  const today = getToday();
  const yesterday = shiftDate(today, -1);

  const rangeStart = useMemo(() => {
    switch (range) {
      case "7days": return shiftDate(today, -7);
      case "30days": return shiftDate(today, -30);
      case "custom": return activeRange.start;
      default: return "";
    }
  }, [range, today, activeRange.start]);

  const rangeEnd = useMemo(() => {
    switch (range) {
      case "7days":
      case "30days": return yesterday;
      case "custom": return activeRange.end;
      default: return "";
    }
  }, [range, yesterday, activeRange.end]);

  const { stats: todayStats, loading: todayLoading } = useTodayStats(businessId!);
  const { statsByDate, loading: rangeLoading } = useDateRangeStats(
    businessId!,
    rangeStart,
    rangeEnd
  );

  const loading = range === "today" ? todayLoading : rangeLoading;

  const aggregated = useMemo(() => {
    if (range === "today") return todayStats ?? null;
    return statsByDate.length > 0 ? aggregateStats(statsByDate) : null;
  }, [range, todayStats, statsByDate]);

  const skipRate =
    aggregated && aggregated.totalJoined > 0
      ? Math.round((aggregated.skippedCount / aggregated.totalJoined) * 1000) / 10
      : 0;
  const removeRate =
    aggregated && aggregated.totalJoined > 0
      ? Math.round((aggregated.removedCount / aggregated.totalJoined) * 1000) / 10
      : 0;

  const top3Hours = aggregated ? getTop3Hours(aggregated.hourlyDistribution) : [];

  const barData =
    range !== "today" && statsByDate.length > 0
      ? statsByDate.map((d) => ({
          date: formatBarDate(d.date),
          completed: d.completedCount,
        }))
      : null;

  return (
    <div className="staff-page">
      <h1>Analytics</h1>

      <div className="staff-range-tabs">
        {RANGES.map(({ key, label }) => (
          <button
            key={key}
            className={"staff-range-tab" + (range === key ? " active" : "")}
            onClick={() => setRange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <input
            type="date"
            value={customStart}
            max={today}
            onChange={(e) => setCustomStart(e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #d4b896", borderRadius: "8px", background: "#f5ede3" }}
          />
          <input
            type="date"
            value={customEnd}
            max={today}
            onChange={(e) => setCustomEnd(e.target.value)}
            style={{ padding: "0.5rem", border: "1px solid #d4b896", borderRadius: "8px", background: "#f5ede3" }}
          />
          <button
            className="staff-btn"
            onClick={() => setActiveRange({ start: customStart, end: customEnd })}
          >
            Load
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : !aggregated ? (
        <div className="loading">No data for this period.</div>
      ) : (
        <>
          <div className="staff-stats-grid">
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.completedCount}</div>
              <div className="staff-stat-label">Total Served</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.avgWaitTime} min</div>
              <div className="staff-stat-label">Avg Wait Time</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.avgServiceTime} min</div>
              <div className="staff-stat-label">Avg Service Time</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{skipRate}%</div>
              <div className="staff-stat-label">Skip Rate</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{removeRate}%</div>
              <div className="staff-stat-label">Remove Rate</div>
            </div>
            <div className="staff-stat-card">
              <div className="staff-stat-value">{aggregated.totalJoined}</div>
              <div className="staff-stat-label">Total Joined</div>
            </div>
          </div>

          {barData && (
            <div className="staff-chart-section">
              <div className="staff-section-title">Customers Served Per Day</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5ede3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#b8926a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {top3Hours.length > 0 && (
            <div className="staff-hours-list">
              <div className="staff-section-title">Busiest Hours</div>
              {top3Hours.map(({ hour, count }) => (
                <div key={hour} className="staff-hour-row">
                  <span>{formatHour(hour)}</span>
                  <span>{count} customers</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
