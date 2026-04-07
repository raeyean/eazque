import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";
import { colors, common } from "../theme";

export default function RootNavigator() {
  const { user, businessId, loading } = useAuth();

  if (loading) {
    return (
      <View style={[common.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user || !businessId) {
    return <AuthStack />;
  }

  return <MainTabs />;
}
