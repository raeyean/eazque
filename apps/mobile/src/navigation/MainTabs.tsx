import { Pressable } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import QueueScreen from "../screens/QueueScreen";
import StaffScreen from "../screens/StaffScreen";
import HistoryScreen from "../screens/HistoryScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { role } = useAuth();
  const navigation = useNavigation<any>();
  const isOwner = role === "owner";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textDark,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Queue: "list",
            History: "time-outline",
            Analytics: "bar-chart-outline",
            Staff: "people-outline",
          };
          return (
            <Ionicons name={icons[route.name] ?? "ellipse"} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          headerRight: isOwner
            ? () => (
                <Pressable
                  onPress={() => navigation.navigate("Settings")}
                  style={{ marginRight: 16 }}
                  accessibilityLabel="Settings"
                >
                  <Ionicons
                    name="settings-outline"
                    size={24}
                    color={colors.textDark}
                  />
                </Pressable>
              )
            : undefined,
        }}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Analytics" component={PlaceholderScreen} />
      {isOwner && (
        <Tab.Screen name="Staff" component={StaffScreen} />
      )}
    </Tab.Navigator>
  );
}
