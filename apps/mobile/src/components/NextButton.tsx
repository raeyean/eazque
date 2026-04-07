import { Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface NextButtonProps {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}

export default function NextButton({
  onPress,
  disabled,
  loading,
}: NextButtonProps) {
  return (
    <Pressable
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel="Next"
      accessibilityRole="button"
    >
      <Text style={styles.text}>{loading ? "Advancing..." : "Next"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
});
