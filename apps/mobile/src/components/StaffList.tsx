import { FlatList, View, Text, StyleSheet } from "react-native";
import type { Staff } from "@eazque/shared";
import StaffCard from "./StaffCard";
import { colors } from "../theme";

interface StaffListProps {
  staff: Staff[];
  currentUserId: string;
  onRemove: (staffId: string) => void;
}

export default function StaffList({
  staff,
  currentUserId,
  onRemove,
}: StaffListProps) {
  if (staff.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No staff members yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={staff}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <StaffCard
          member={item}
          onRemove={onRemove}
          isCurrentUser={item.id === currentUserId}
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
