import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { Staff } from "@eazque/shared";
import { colors } from "../theme";

interface StaffCardProps {
  member: Staff;
  onRemove: (staffId: string) => void;
  isCurrentUser: boolean;
}

export default function StaffCard({
  member,
  onRemove,
  isCurrentUser,
}: StaffCardProps) {
  const renderRightActions = () => {
    if (isCurrentUser) return null;
    return (
      <View style={styles.actions}>
        <Pressable
          style={[styles.action, { backgroundColor: colors.remove }]}
          onPress={() => onRemove(member.id)}
        >
          <Text style={styles.actionText}>Remove</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.email}>{member.email}</Text>
          </View>
          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    member.role === "owner"
                      ? colors.primary
                      : colors.secondary,
                },
              ]}
            >
              <Text style={styles.badgeText}>
                {member.role === "owner" ? "Owner" : "Staff"}
              </Text>
            </View>
            {member.status === "pending" && (
              <View style={[styles.badge, { backgroundColor: colors.skip }]}>
                <Text style={styles.badgeText}>Pending</Text>
              </View>
            )}
          </View>
        </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textDark,
  },
  email: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
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
