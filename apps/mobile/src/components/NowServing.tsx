import { View, Text, StyleSheet } from "react-native";
import { formatDisplayNumber } from "@eazque/shared";
import { colors } from "../theme";

interface NowServingProps {
  currentNumber: number;
}

export default function NowServing({ currentNumber }: NowServingProps) {
  const isServing = currentNumber > 0;

  return (
    <View style={styles.container}>
      {isServing ? (
        <>
          <Text style={styles.label}>Now Serving</Text>
          <Text style={styles.number}>
            {formatDisplayNumber(currentNumber)}
          </Text>
        </>
      ) : (
        <Text style={styles.empty}>No one serving</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 4,
  },
  number: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 64,
  },
  empty: {
    fontSize: 18,
    color: colors.secondary,
    fontStyle: "italic",
  },
});
