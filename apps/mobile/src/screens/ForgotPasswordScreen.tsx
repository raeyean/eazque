import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";
import { colors, common } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<
  { Login: undefined; SignUp: undefined; ForgotPassword: undefined },
  "ForgotPassword"
>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      // Don't reveal whether the email exists
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={common.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>

        {sent ? (
          <>
            <Text style={styles.successText}>
              If that email is registered, you'll receive a reset link shortly.
            </Text>
            <Pressable
              style={common.button}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={common.buttonText}>Back to Login</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a reset link.
            </Text>
            <TextInput
              style={common.input}
              placeholder="Email"
              placeholderTextColor={colors.secondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Email"
              autoFocus
            />
            <Pressable
              style={[common.button, (!email.trim() || loading) && common.buttonDisabled]}
              onPress={handleSend}
              disabled={!email.trim() || loading}
            >
              <Text style={common.buttonText}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.linkButton}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.linkText}>Back to login</Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  successText: {
    fontSize: 15,
    color: "#4caf50",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  linkButton: {
    marginTop: 16,
    alignItems: "center",
  },
  linkText: {
    color: colors.primary,
    fontSize: 15,
  },
});
