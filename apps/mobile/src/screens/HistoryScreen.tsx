import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useQueueByDate } from "../hooks/useQueueByDate";
import { useHistoryEntries } from "../hooks/useHistoryEntries";
import HistoryEntryList from "../components/HistoryEntryList";
import { colors, common } from "../theme";
import { localDateString } from "@eazque/shared";

function getToday(): string {
  return localDateString();
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

function formatDateLabel(dateStr: string): string {
  if (dateStr === getToday()) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HistoryScreen() {
  const { businessId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getToday);

  const { queue, queueId, loading: queueLoading } = useQueueByDate(
    businessId!,
    selectedDate
  );
  const { entries, loading: entriesLoading } = useHistoryEntries(
    businessId!,
    queueId
  );

  const isToday = selectedDate === getToday();
  const loading = queueLoading || entriesLoading;

  const completedCount = entries.filter((e) => e.status === "completed").length;
  const skippedCount = entries.filter((e) => e.status === "skipped").length;
  const removedCount = entries.filter((e) => e.status === "removed").length;

  return (
    <View style={common.screen}>
      <View style={styles.dateNav}>
        <Pressable
          onPress={() => setSelectedDate((d) => shiftDate(d, -1))}
          style={styles.arrowButton}
          accessibilityLabel="Previous day"
        >
          <Ionicons name="chevron-back" size={24} color={colors.textDark} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
        <Pressable
          onPress={() => setSelectedDate((d) => shiftDate(d, 1))}
          style={[styles.arrowButton, isToday && styles.arrowDisabled]}
          disabled={isToday}
          accessibilityLabel="Next day"
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isToday ? colors.lightAccent : colors.textDark}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={[common.screen, styles.center]}>
          <Text style={common.subtitle}>Loading history...</Text>
        </View>
      ) : !queue ? (
        <View style={[common.screen, styles.center]}>
          <Text style={common.subtitle}>No queue found for this date</Text>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {completedCount} completed, {skippedCount} skipped, {removedCount} removed
            </Text>
          </View>
          <View style={common.container}>
            <HistoryEntryList entries={entries} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  dateNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrowButton: {
    padding: 8,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
  },
  summary: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.secondary,
  },
});
