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

type Props = NativeStackScreenProps<{ Login: undefined; SignUp: undefined }, "SignUp">;

export default function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    const trimmedBusiness = businessName.trim();
    const trimmedOwner = ownerName.trim();

    if (!trimmedBusiness) return setError("Business name is required.");
    if (!trimmedOwner) return setError("Your name is required.");
    if (!trimmedEmail || !trimmedEmail.includes("@")) return setError("Valid email is required.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");

    setError(null);
    setLoading(true);
    try {
      await signUp(trimmedEmail, password, trimmedBusiness, trimmedOwner);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already-exists") || msg.includes("email-already")) {
        setError("Email already registered. Try signing in.");
      } else if (msg.includes("invalid-argument")) {
        setError("Invalid input. Check your details and try again.");
      } else {
        setError("Sign up failed. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={common.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Create Business</Text>

        {error && <Text style={common.errorText}>{error}</Text>}

        <TextInput
          style={common.input}
          placeholder="Business Name"
          placeholderTextColor={colors.secondary}
          value={businessName}
          onChangeText={setBusinessName}
          accessibilityLabel="Business Name"
        />
        <TextInput
          style={common.input}
          placeholder="Your Name"
          placeholderTextColor={colors.secondary}
          value={ownerName}
          onChangeText={setOwnerName}
          accessibilityLabel="Your Name"
        />
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
          style={[common.button, (loading || !email || !password || !businessName || !ownerName) && common.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading || !email || !password || !businessName || !ownerName}
        >
          <Text style={common.buttonText}>
            {loading ? "Creating..." : "Create Business"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.linkText}>Back to login</Text>
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
    fontSize: 28,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "center",
    marginBottom: 24,
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
