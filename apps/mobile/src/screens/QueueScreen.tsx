import { View, Text } from "react-native";
import { common, colors } from "../theme";

export default function QueueScreen() {
  return (
    <View style={[common.screen, { justifyContent: "center", alignItems: "center" }]}>
      <Text style={{ fontSize: 20, color: colors.textDark }}>Queue (building...)</Text>
    </View>
  );
}
