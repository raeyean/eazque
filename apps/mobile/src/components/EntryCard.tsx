import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { QueueEntry } from "@eazque/shared";
import { colors } from "../theme";

interface EntryCardProps {
  entry: QueueEntry;
  onSkip: (entryId: string) => void;
  onRemove: (entryId: string) => void;
  onAddNote: (entryId: string) => void;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

export default function EntryCard({
  entry,
  onSkip,
  onRemove,
  onAddNote,
}: EntryCardProps) {
  const renderRightActions = () => (
    <View style={styles.actions}>
      <Pressable
        style={[styles.action, { backgroundColor: colors.note }]}
        onPress={() => onAddNote(entry.id)}
      >
        <Text style={styles.actionText}>Note</Text>
      </Pressable>
      <Pressable
        style={[styles.action, { backgroundColor: colors.skip }]}
        onPress={() => onSkip(entry.id)}
      >
        <Text style={styles.actionText}>Skip</Text>
      </Pressable>
      <Pressable
        style={[styles.action, { backgroundColor: colors.remove }]}
        onPress={() => onRemove(entry.id)}
      >
        <Text style={styles.actionText}>Remove</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.displayNumber}>{entry.displayNumber}</Text>
          <Text style={styles.customerName}>{entry.customerName}</Text>
          <Text style={styles.time}>{formatTimeAgo(entry.joinedAt)}</Text>
        </View>
        {entry.notes ? (
          <Text style={styles.notes}>{entry.notes}</Text>
        ) : null}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  displayNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    width: 56,
  },
  customerName: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
  },
  time: {
    fontSize: 13,
    color: colors.secondary,
  },
  notes: {
    fontSize: 13,
    color: colors.note,
    marginTop: 4,
    marginLeft: 68,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 72,
  },
  actionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
});
