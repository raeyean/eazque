import { StyleSheet } from "react-native";

export const colors = {
  primary: "#B8926A",
  secondary: "#D4B896",
  lightAccent: "#E8D5BE",
  surface: "#F5EDE3",
  background: "#FBF8F4",
  textDark: "#5A4430",
  whatsapp: "#25D366",
  white: "#FFFFFF",
  error: "#C0392B",
  skip: "#F39C12",
  remove: "#E74C3C",
  note: "#3498DB",
};

export const common = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: colors.textDark,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: "center" as const,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
