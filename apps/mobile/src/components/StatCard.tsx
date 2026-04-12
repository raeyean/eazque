import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

export default function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>
        {value}{unit ? ` ${unit}` : ""}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: "45%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.secondary,
  },
});
