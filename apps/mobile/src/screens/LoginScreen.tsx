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
import { useAuth } from "../contexts/AuthContext";
import { colors, common } from "../theme";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<{ Login: undefined; SignUp: undefined; ForgotPassword: undefined }, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={common.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>eazque</Text>
        <Text style={styles.subtitle}>Business Owner Login</Text>

        {error && <Text style={common.errorText}>{error}</Text>}

        <TextInput
          style={common.input}
          placeholder="Email"
          placeholderTextColor={colors.secondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Email"
        />
        <TextInput
          style={common.input}
          placeholder="Password"
          placeholderTextColor={colors.secondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Password"
        />

        <Pressable
          style={[common.button, loading && common.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={common.buttonText}>
            {loading ? "Logging in..." : "Log In"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate("ForgotPassword")}
        >
          <Text style={[styles.linkText, { color: colors.secondary, fontSize: 14 }]}>
            Forgot password?
          </Text>
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.linkText}>Create a new business account</Text>
        </Pressable>
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
    fontSize: 36,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 32,
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
