import { View, Text, StyleSheet } from "react-native";
import { colors, common } from "../theme";

export default function SettingsScreen() {
  return (
    <View style={[common.screen, styles.center]}>
      <Text style={styles.text}>Settings</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondary,
    marginTop: 4,
  },
});
