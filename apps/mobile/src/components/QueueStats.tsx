import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface QueueStatsProps {
  waitingCount: number;
  avgServiceTime: number;
}

export default function QueueStats({
  waitingCount,
  avgServiceTime,
}: QueueStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{waitingCount}</Text>
        <Text style={styles.statLabel}>Waiting</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.statValue}>
          {Math.round(avgServiceTime)} min
        </Text>
        <Text style={styles.statLabel}>Avg Time</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textDark,
  },
  statLabel: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.lightAccent,
  },
});
