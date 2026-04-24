import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "./MainTabs";
import SettingsScreen from "../screens/SettingsScreen";
import QRCodeScreen from "../screens/QRCodeScreen";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

export default function AppStack() {
  const { role } = useAuth();
  const isOwner = role === "owner";

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QRCode"
        component={QRCodeScreen}
        options={{
          title: "QR Code",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textDark,
        }}
      />
      {isOwner && (
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: "Settings",
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textDark,
          }}
        />
      )}
    </Stack.Navigator>
  );
}
