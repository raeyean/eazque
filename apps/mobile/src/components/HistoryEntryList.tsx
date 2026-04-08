import { FlatList, View, Text, StyleSheet } from "react-native";
import type { QueueEntry } from "@eazque/shared";
import HistoryEntryCard from "./HistoryEntryCard";
import { colors } from "../theme";

interface HistoryEntryListProps {
  entries: QueueEntry[];
}

export default function HistoryEntryList({ entries }: HistoryEntryListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No entries for this date</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <HistoryEntryCard entry={item} />}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    fontStyle: "italic",
  },
});
