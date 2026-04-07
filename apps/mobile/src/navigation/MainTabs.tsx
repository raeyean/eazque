import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import QueueScreen from "../screens/QueueScreen";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import { colors } from "../theme";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
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
      <Tab.Screen name="Queue" component={QueueScreen} />
      <Tab.Screen name="History" component={PlaceholderScreen} />
      <Tab.Screen name="Analytics" component={PlaceholderScreen} />
      <Tab.Screen name="Staff" component={PlaceholderScreen} />
    </Tab.Navigator>
  );
}
