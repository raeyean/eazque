import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";

const INITIALS_COLORS = [
  "#B8926A", "#8B6F47", "#A0845C", "#C4A882", "#6B5240", "#D4956A",
];

function getInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "?";
  return (words[0][0]?.toUpperCase() ?? "") + (words[1][0]?.toUpperCase() ?? "");
}

interface BusinessAvatarProps {
  uri?: string;
  name: string;
  size: number;
  onPress?: () => void;
  uploading?: boolean;
}

export default function BusinessAvatar({
  uri,
  name,
  size,
  onPress,
  uploading,
}: BusinessAvatarProps) {
  const circle = { width: size, height: size, borderRadius: size / 2 };

  const content = (
    <View style={[styles.container, circle]}>
      {uri ? (
        <Image
          testID="business-avatar-image"
          source={{ uri }}
          style={circle}
        />
      ) : (
        <View
          style={[
            styles.initialsContainer,
            circle,
            { backgroundColor: getInitialsColor(name) },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {uploading && (
        <View style={[styles.overlay, { borderRadius: size / 2 }]}>
          <ActivityIndicator color={colors.white} />
        </View>
      )}
      {onPress && !uploading && (
        <View style={styles.cameraIcon}>
          <Ionicons name="camera" size={14} color={colors.white} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  initialsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 3,
  },
});
