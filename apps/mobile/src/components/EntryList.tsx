import { FlatList, View, Text, StyleSheet } from "react-native";
import type { QueueEntry } from "@eazque/shared";
import EntryCard from "./EntryCard";
import { colors } from "../theme";

interface EntryListProps {
  entries: QueueEntry[];
  onSkip: (entryId: string) => void;
  onRemove: (entryId: string) => void;
  onAddNote: (entryId: string) => void;
}

export default function EntryList({
  entries,
  onSkip,
  onRemove,
  onAddNote,
}: EntryListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No one in the queue yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <EntryCard
          entry={item}
          onSkip={onSkip}
          onRemove={onRemove}
          onAddNote={onAddNote}
        />
      )}
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
