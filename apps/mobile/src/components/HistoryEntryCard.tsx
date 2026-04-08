import { View, Text, StyleSheet } from "react-native";
import type { QueueEntry } from "@eazque/shared";
import { colors } from "../theme";

interface HistoryEntryCardProps {
  entry: QueueEntry;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: "Completed", color: "#27AE60" },
  skipped: { label: "Skipped", color: colors.skip },
  removed: { label: "Removed", color: colors.remove },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function HistoryEntryCard({ entry }: HistoryEntryCardProps) {
  const config = STATUS_CONFIG[entry.status] ?? {
    label: entry.status,
    color: colors.secondary,
  };

  return (
    <View style={styles.card}>
      <Text style={styles.displayNumber}>{entry.displayNumber}</Text>
      <View style={styles.middle}>
        <Text style={styles.customerName}>{entry.customerName}</Text>
        <Text style={styles.time}>{formatTime(entry.joinedAt)}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: config.color }]}>
        <Text style={styles.badgeText}>{config.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  displayNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    width: 56,
  },
  middle: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    color: colors.textDark,
  },
  time: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
});
