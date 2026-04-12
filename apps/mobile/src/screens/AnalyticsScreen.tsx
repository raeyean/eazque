import { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  StyleSheet,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { useAuth } from "../contexts/AuthContext";
import { useTodayStats } from "../hooks/useTodayStats";
import { useDateRangeStats } from "../hooks/useDateRangeStats";
import StatCard from "../components/StatCard";
import type { DailyStats } from "@eazque/shared";
import { colors, common } from "../theme";

type RangeType = "today" | "7days" | "30days" | "custom";

const SCREEN_WIDTH = Dimensions.get("window").width;

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

  return {
    totalJoined,
    completedCount,
    skippedCount,
    removedCount,
    avgServiceTime,
    avgWaitTime,
    hourlyDistribution,
  };
}

function getTop3Hours(
  distribution: Record<string, number>
): Array<{ hour: number; count: number }> {
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

export default function AnalyticsScreen() {
  const { businessId } = useAuth();
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
    if (range === "today") {
      return todayStats
        ? {
            totalJoined: todayStats.totalJoined,
            completedCount: todayStats.completedCount,
            skippedCount: todayStats.skippedCount,
            removedCount: todayStats.removedCount,
            avgServiceTime: todayStats.avgServiceTime,
            avgWaitTime: todayStats.avgWaitTime,
            hourlyDistribution: todayStats.hourlyDistribution,
          }
        : null;
    }
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

  const barData = useMemo(() => {
    if (range === "today" || statsByDate.length === 0) return null;
    return {
      labels: statsByDate.map((d) => formatBarDate(d.date)),
      datasets: [{ data: statsByDate.map((d) => d.completedCount) }],
    };
  }, [range, statsByDate]);

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.content}>
      {/* Range selector */}
      <View style={styles.rangeRow}>
        {RANGES.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.chip, range === key && styles.chipActive]}
            onPress={() => setRange(key)}
          >
            <Text style={[styles.chipText, range === key && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom date inputs */}
      {range === "custom" && (
        <View style={styles.customRow}>
          <TextInput
            style={[common.input, styles.dateInput]}
            value={customStart}
            onChangeText={setCustomStart}
            placeholder="Start YYYY-MM-DD"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
          />
          <TextInput
            style={[common.input, styles.dateInput]}
            value={customEnd}
            onChangeText={setCustomEnd}
            placeholder="End YYYY-MM-DD"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
          />
          <Pressable
            style={[common.button, styles.loadButton]}
            onPress={() => setActiveRange({ start: customStart, end: customEnd })}
          >
            <Text style={common.buttonText}>Load</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <Text style={common.subtitle}>Loading analytics...</Text>
        </View>
      ) : !aggregated ? (
        <View style={styles.center}>
          <Text style={common.subtitle}>No data for this period</Text>
        </View>
      ) : (
        <>
          {/* Stat cards grid */}
          <View style={styles.grid}>
            <StatCard label="Total Served" value={aggregated.completedCount} />
            <StatCard label="Avg Service Time" value={aggregated.avgServiceTime} unit="min" />
            <StatCard label="Avg Wait Time" value={aggregated.avgWaitTime} unit="min" />
            <StatCard label="Skip Rate" value={`${skipRate}%`} />
            <StatCard label="Remove Rate" value={`${removeRate}%`} />
            <StatCard label="Total Joined" value={aggregated.totalJoined} />
          </View>

          {/* Bar chart (multi-day only) */}
          {barData && (
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Customers Served Per Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={barData}
                  width={Math.max(SCREEN_WIDTH - 32, barData.labels.length * 52)}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={{
                    backgroundColor: colors.white,
                    backgroundGradientFrom: colors.white,
                    backgroundGradientTo: colors.white,
                    color: (opacity = 1) => `rgba(184, 146, 106, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(90, 68, 48, ${opacity})`,
                    barPercentage: 0.7,
                  }}
                  style={{ borderRadius: 8 }}
                  showValuesOnTopOfBars
                  fromZero
                />
              </ScrollView>
            </View>
          )}

          {/* Busiest hours */}
          {top3Hours.length > 0 && (
            <View style={styles.hoursSection}>
              <Text style={styles.sectionTitle}>Busiest Hours</Text>
              {top3Hours.map(({ hour, count }) => (
                <View key={hour} style={styles.hourRow}>
                  <Text style={styles.hourLabel}>{formatHour(hour)}</Text>
                  <Text style={styles.hourCount}>{count} customers</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    paddingVertical: 48,
    alignItems: "center",
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textDark,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  customRow: {
    marginBottom: 16,
    gap: 8,
  },
  dateInput: {
    marginBottom: 0,
  },
  loadButton: {
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  chartSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 12,
  },
  hoursSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  hourLabel: {
    fontSize: 14,
    color: colors.textDark,
  },
  hourCount: {
    fontSize: 14,
    color: colors.secondary,
  },
});
