import { useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useAuth } from "../contexts/AuthContext";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
import { colors, common } from "../theme";

const CUSTOMER_WEB_URL =
  process.env.EXPO_PUBLIC_CUSTOMER_WEB_URL ?? "https://eazque.app";

export default function QRCodeScreen() {
  const { businessId } = useAuth();
  const { business, loading } = useBusinessSettings(businessId!);
  const viewShotRef = useRef<ViewShot>(null);

  const url = `${CUSTOMER_WEB_URL}/q/${businessId}`;

  const captureQR = async (): Promise<string> => {
    return captureRef(viewShotRef, { format: "png", quality: 1 });
  };

  const handleSave = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to Photos to save the QR code."
        );
        return;
      }
      const uri = await captureQR();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved", "QR code saved to Photos.");
    } catch {
      Alert.alert("Error", "Failed to save QR code. Please try again.");
    }
  };

  const handleShare = async () => {
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Error", "Sharing is not available on this device.");
        return;
      }
      const uri = await captureQR();
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
      });
    } catch {
      Alert.alert("Error", "Failed to share QR code. Please try again.");
    }
  };

  if (loading || !business) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={common.screen} contentContainerStyle={styles.container}>
      <Text style={styles.hint}>
        Display this QR code at your business for customers to join the queue.
      </Text>

      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
        <View style={styles.card}>
          <Text style={styles.businessName}>{business.name}</Text>
          <QRCode
            value={url}
            size={240}
            color={colors.textDark}
            backgroundColor={colors.white}
          />
          <Text style={styles.urlText}>{url}</Text>
        </View>
      </ViewShot>

      <Pressable style={[common.button, styles.button]} onPress={handleSave}>
        <Text style={common.buttonText}>Save to Photos</Text>
      </Pressable>

      <Pressable
        style={[common.button, styles.button, styles.shareButton]}
        onPress={handleShare}
      >
        <Text style={common.buttonText}>Share</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  hint: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 32,
  },
  businessName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 16,
    textAlign: "center",
  },
  urlText: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 12,
    textAlign: "center",
    fontFamily: "monospace",
  },
  button: {
    width: "100%",
    marginBottom: 12,
  },
  shareButton: {
    backgroundColor: colors.secondary,
  },
});
