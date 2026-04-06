# Plan 4: Auth + Navigation + Queue Tab — Business Mobile App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core business owner mobile experience — Firebase Auth login/signup, React Navigation bottom tabs, and the Queue management tab where owners serve customers in real time.

**Architecture:** Expo React Native app with Firebase JS SDK for auth (AsyncStorage persistence), Firestore real-time listeners for queue/entry data, and React Navigation v7 bottom tabs with native stack navigators. Pure components (NowServing, QueueStats, EntryCard) are tested with TDD. Firebase hooks and queue action services are separated from UI. Auth state flows through React Context.

**Tech Stack:** Expo SDK 54, React Native 0.81, React Navigation 7, Firebase JS SDK 11, AsyncStorage, react-native-gesture-handler (Swipeable), Jest + React Native Testing Library, @eazque/shared

---

## File Structure

### New files to create:

```
apps/mobile/.env.example                        # Firebase config template
apps/mobile/jest.setup.ts                       # Test setup with RNTL matchers
apps/mobile/src/config/firebase.ts              # Firebase client SDK init (auth, db, functions)
apps/mobile/src/theme.ts                        # Warm Sand color tokens + common styles
apps/mobile/src/contexts/AuthContext.tsx         # Auth state provider (user, businessId, role)
apps/mobile/src/navigation/RootNavigator.tsx    # Auth gate: login stack or main tabs
apps/mobile/src/navigation/AuthStack.tsx        # Login + Signup screens
apps/mobile/src/navigation/MainTabs.tsx         # Bottom tabs (Queue, History, Analytics, Staff)
apps/mobile/src/screens/LoginScreen.tsx         # Email + password login
apps/mobile/src/screens/SignUpScreen.tsx         # Create account + business + default queue
apps/mobile/src/screens/QueueScreen.tsx         # Main queue management screen
apps/mobile/src/screens/PlaceholderScreen.tsx   # Stub for tabs not yet built
apps/mobile/src/components/NowServing.tsx       # Big "Now Serving" display
apps/mobile/src/components/NowServing.test.tsx  # Tests
apps/mobile/src/components/QueueStats.tsx       # Stats row (waiting, avg time)
apps/mobile/src/components/QueueStats.test.tsx  # Tests
apps/mobile/src/components/NextButton.tsx       # Advance queue button
apps/mobile/src/components/EntryCard.tsx        # Queue entry with swipe actions
apps/mobile/src/components/EntryCard.test.tsx   # Tests
apps/mobile/src/components/EntryList.tsx        # FlatList of EntryCards
apps/mobile/src/hooks/useQueue.ts               # Real-time listener for active queue
apps/mobile/src/hooks/useQueueEntries.ts        # Real-time listener for queue entries
apps/mobile/src/services/queueActions.ts        # advanceQueue, skipEntry, removeEntry, addNote
```

### Files to modify:

```
apps/mobile/package.json                        # Add dependencies
apps/mobile/App.tsx                             # NavigationContainer + AuthProvider + GestureHandler
package.json                                    # Add test:mobile script
firebase/firestore.rules                        # Allow owner bootstrap during signup
```

### Responsibilities:

| File | Responsibility |
|------|---------------|
| `firebase.ts` | Initialize Firebase app, auth (with AsyncStorage persistence), db, functions; connect emulators in dev |
| `theme.ts` | Warm Sand color tokens, common text/layout styles |
| `AuthContext.tsx` | Firebase Auth state management, business/role loading, signIn/signUp/signOut |
| `RootNavigator.tsx` | Shows AuthStack when unauthenticated, MainTabs when authenticated |
| `AuthStack.tsx` | Stack navigator with Login and SignUp screens |
| `MainTabs.tsx` | Bottom tab navigator with Queue, History, Analytics, Staff tabs |
| `LoginScreen.tsx` | Email + password form, error display, link to signup |
| `SignUpScreen.tsx` | Email + password + business name, creates auth + business + staff + queue |
| `QueueScreen.tsx` | Assembles NowServing + QueueStats + NextButton + EntryList + note modal |
| `NowServing.tsx` | Pure component: large current number display or "No one serving" |
| `QueueStats.tsx` | Pure component: waiting count, avg service time |
| `NextButton.tsx` | Large primary button to advance queue, disabled when no entries waiting |
| `EntryCard.tsx` | Entry display (name, number, time, notes) with Swipeable actions |
| `EntryList.tsx` | FlatList wrapper rendering EntryCards |
| `useQueue.ts` | Hook: real-time Firestore listener on first queue for a business |
| `useQueueEntries.ts` | Hook: real-time listener on entries with status waiting/serving |
| `queueActions.ts` | Service: advanceQueue, skipEntry, removeEntry, addNote — Firestore batch writes |

---

## Task 1: Project Setup — Dependencies, Firebase, Theme, Testing

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/.env.example`, `apps/mobile/jest.setup.ts`, `apps/mobile/src/config/firebase.ts`, `apps/mobile/src/theme.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Update `apps/mobile/package.json`**

Add new dependencies and test config. Replace the entire file:

```json
{
  "name": "@eazque/mobile",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest"
  },
  "dependencies": {
    "@eazque/shared": "*",
    "@react-native-async-storage/async-storage": "~2.1.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "expo": "~54.0.33",
    "expo-status-bar": "~3.0.9",
    "firebase": "^11.0.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.25.0",
    "react-native-reanimated": "~3.17.0",
    "react-native-safe-area-context": "~5.4.0",
    "react-native-screens": "~4.11.0"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.0.0",
    "@types/react": "~19.1.0",
    "jest": "^29.0.0",
    "jest-expo": "~54.0.0",
    "typescript": "~5.9.2"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterSetup": ["<rootDir>/jest.setup.ts"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|firebase/.*|@firebase/.*)"
    ]
  }
}
```

- [ ] **Step 2: Create `apps/mobile/.env.example`**

```
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
```

- [ ] **Step 3: Create `apps/mobile/jest.setup.ts`**

```ts
import "@testing-library/react-native/extend-expect";
```

- [ ] **Step 4: Create `apps/mobile/src/config/firebase.ts`**

```ts
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
} from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const functions = getFunctions(app);

if (__DEV__) {
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  try {
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
  } catch {
    // Already connected — safe to ignore during Fast Refresh
  }
}
```

- [ ] **Step 5: Create `apps/mobile/src/theme.ts`**

```ts
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
```

- [ ] **Step 6: Add root test:mobile script**

Add to root `package.json` scripts:

```json
"test:mobile": "npm run test --workspace=apps/mobile"
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: installs firebase, react-navigation, gesture-handler, testing libraries, etc.

- [ ] **Step 8: Verify test runner works**

```bash
npm run test:mobile -- --passWithNoTests
```

Expected: Jest exits with code 0 (no test files yet).

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/ package.json
git commit -m "feat(mobile): add dependencies, Firebase client SDK, Warm Sand theme, and test setup

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Auth Context + Firestore Rules Update

**Files:**
- Create: `apps/mobile/src/contexts/AuthContext.tsx`
- Modify: `firebase/firestore.rules`

- [ ] **Step 1: Create `apps/mobile/src/contexts/AuthContext.tsx`**

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

interface AuthState {
  user: User | null;
  businessId: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    businessName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    businessId: null,
    loading: true,
  });
  const signingUpRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (signingUpRef.current) return;

      if (user) {
        const bizDoc = await getDoc(doc(db, "businesses", user.uid));
        setState({
          user,
          businessId: bizDoc.exists() ? user.uid : null,
          loading: false,
        });
      } else {
        setState({ user: null, businessId: null, loading: false });
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    businessName: string
  ) => {
    signingUpRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      const today = new Date().toISOString().split("T")[0];

      // 1. Create business doc (rule: isAuth)
      await setDoc(doc(db, "businesses", uid), {
        name: businessName,
        logo: "",
        primaryColor: "#B8926A",
        whatsappNumber: "",
        whatsappApiKey: "",
        defaultEstimatedTimePerCustomer: 10,
        approachingThreshold: 3,
        formFields: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create owner staff doc (rule: bootstrap — businessId == auth.uid)
      await setDoc(doc(db, `businesses/${uid}/staff/${uid}`), {
        email,
        name: businessName,
        role: "owner",
        createdAt: serverTimestamp(),
      });

      // 3. Create default queue (rule: isBusinessStaff — staff doc now exists)
      await addDoc(collection(db, `businesses/${uid}/queues`), {
        name: "Main Queue",
        status: "active",
        currentNumber: 0,
        nextNumber: 1,
        date: today,
        avgServiceTime: 0,
        completedCount: 0,
      });

      setState({ user: cred.user, businessId: uid, loading: false });
    } finally {
      signingUpRef.current = false;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Update Firestore rules for owner bootstrap**

In `firebase/firestore.rules`, replace the staff subcollection rules:

```
      // Staff subcollection
      match /staff/{staffId} {
        allow read: if isBusinessStaff(businessId);
        // Owner can manage staff; authenticated user can bootstrap own owner doc
        allow create: if isBusinessOwner(businessId) ||
          (isAuth() && staffId == request.auth.uid &&
           request.resource.data.role == "owner" &&
           businessId == request.auth.uid);
        allow update: if isBusinessOwner(businessId);
        allow delete: if isBusinessOwner(businessId);
      }
```

This allows: an authenticated user can create their own staff doc with role "owner" only when the businessId matches their UID (bootstrapping their own business).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/contexts/AuthContext.tsx firebase/firestore.rules
git commit -m "feat(mobile): add AuthContext with signIn/signUp/signOut and update Firestore rules for owner bootstrap

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Navigation Shell + Auth Screens

**Files:**
- Create: `apps/mobile/src/screens/LoginScreen.tsx`, `apps/mobile/src/screens/SignUpScreen.tsx`, `apps/mobile/src/screens/PlaceholderScreen.tsx`, `apps/mobile/src/navigation/AuthStack.tsx`, `apps/mobile/src/navigation/MainTabs.tsx`, `apps/mobile/src/navigation/RootNavigator.tsx`
- Modify: `apps/mobile/App.tsx`

- [ ] **Step 1: Create `apps/mobile/src/screens/LoginScreen.tsx`**

```tsx
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

type Props = NativeStackScreenProps<{ Login: undefined; SignUp: undefined }, "Login">;

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
```

- [ ] **Step 2: Create `apps/mobile/src/screens/SignUpScreen.tsx`**

```tsx
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, businessName.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
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
          onPress={handleSignUp}
          disabled={loading}
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
```

- [ ] **Step 3: Create `apps/mobile/src/screens/PlaceholderScreen.tsx`**

```tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, common } from "../theme";

export default function PlaceholderScreen({ route }: { route: { name: string } }) {
  return (
    <View style={[common.screen, styles.center]}>
      <Text style={styles.text}>{route.name}</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textDark,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondary,
    marginTop: 4,
  },
});
```

- [ ] **Step 4: Create `apps/mobile/src/navigation/AuthStack.tsx`**

```tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 5: Create `apps/mobile/src/navigation/MainTabs.tsx`**

```tsx
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
```

> Note: `QueueScreen` doesn't exist yet — create a placeholder version for now:

Create `apps/mobile/src/screens/QueueScreen.tsx` (temporary placeholder):

```tsx
import { View, Text } from "react-native";
import { common, colors } from "../theme";

export default function QueueScreen() {
  return (
    <View style={[common.screen, { justifyContent: "center", alignItems: "center" }]}>
      <Text style={{ fontSize: 20, color: colors.textDark }}>Queue (building...)</Text>
    </View>
  );
}
```

- [ ] **Step 6: Create `apps/mobile/src/navigation/RootNavigator.tsx`**

```tsx
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
```

- [ ] **Step 7: Update `apps/mobile/App.tsx`**

Replace the entire file:

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 8: Verify the app starts**

```bash
cd apps/mobile && npx expo start --no-dev-client
```

Expected: Metro bundler starts. The app should render LoginScreen. Press `q` to quit.

Alternatively, just verify there are no TypeScript errors:

```bash
cd apps/mobile && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add navigation shell with auth screens, bottom tabs, and root auth gate

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: NowServing + QueueStats + NextButton Components (TDD)

**Files:**
- Create: `apps/mobile/src/components/NowServing.test.tsx`, `apps/mobile/src/components/NowServing.tsx`, `apps/mobile/src/components/QueueStats.test.tsx`, `apps/mobile/src/components/QueueStats.tsx`, `apps/mobile/src/components/NextButton.tsx`

- [ ] **Step 1: Write NowServing tests**

Create `apps/mobile/src/components/NowServing.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import NowServing from "./NowServing";

describe("NowServing", () => {
  it("displays the formatted queue number when serving", () => {
    render(<NowServing currentNumber={5} />);
    expect(screen.getByText("Q-005")).toBeTruthy();
  });

  it("shows 'Now Serving' label when someone is being served", () => {
    render(<NowServing currentNumber={12} />);
    expect(screen.getByText("Now Serving")).toBeTruthy();
    expect(screen.getByText("Q-012")).toBeTruthy();
  });

  it("shows empty state when currentNumber is 0", () => {
    render(<NowServing currentNumber={0} />);
    expect(screen.getByText("No one serving")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: FAIL — cannot find module `./NowServing`.

- [ ] **Step 3: Implement NowServing**

Create `apps/mobile/src/components/NowServing.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import { formatDisplayNumber } from "@eazque/shared";
import { colors } from "../theme";

interface NowServingProps {
  currentNumber: number;
}

export default function NowServing({ currentNumber }: NowServingProps) {
  const isServing = currentNumber > 0;

  return (
    <View style={styles.container}>
      {isServing ? (
        <>
          <Text style={styles.label}>Now Serving</Text>
          <Text style={styles.number}>
            {formatDisplayNumber(currentNumber)}
          </Text>
        </>
      ) : (
        <Text style={styles.empty}>No one serving</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    color: colors.secondary,
    marginBottom: 4,
  },
  number: {
    fontSize: 56,
    fontWeight: "800",
    color: colors.primary,
    lineHeight: 64,
  },
  empty: {
    fontSize: 18,
    color: colors.secondary,
    fontStyle: "italic",
  },
});
```

- [ ] **Step 4: Write QueueStats tests**

Create `apps/mobile/src/components/QueueStats.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import QueueStats from "./QueueStats";

describe("QueueStats", () => {
  it("displays waiting count", () => {
    render(<QueueStats waitingCount={12} avgServiceTime={5} />);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Waiting")).toBeTruthy();
  });

  it("displays average service time in minutes", () => {
    render(<QueueStats waitingCount={0} avgServiceTime={8} />);
    expect(screen.getByText("8 min")).toBeTruthy();
    expect(screen.getByText("Avg Time")).toBeTruthy();
  });

  it("shows 0 for both when no data", () => {
    render(<QueueStats waitingCount={0} avgServiceTime={0} />);
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("0 min")).toBeTruthy();
  });
});
```

- [ ] **Step 5: Implement QueueStats**

Create `apps/mobile/src/components/QueueStats.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface QueueStatsProps {
  waitingCount: number;
  avgServiceTime: number;
}

export default function QueueStats({
  waitingCount,
  avgServiceTime,
}: QueueStatsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{waitingCount}</Text>
        <Text style={styles.statLabel}>Waiting</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.statValue}>
          {Math.round(avgServiceTime)} min
        </Text>
        <Text style={styles.statLabel}>Avg Time</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textDark,
  },
  statLabel: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.lightAccent,
  },
});
```

- [ ] **Step 6: Implement NextButton**

Create `apps/mobile/src/components/NextButton.tsx`:

```tsx
import { Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../theme";

interface NextButtonProps {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}

export default function NextButton({
  onPress,
  disabled,
  loading,
}: NextButtonProps) {
  return (
    <Pressable
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel="Next"
      accessibilityRole="button"
    >
      <Text style={styles.text}>{loading ? "Advancing..." : "Next"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
});
```

- [ ] **Step 7: Run all tests**

```bash
npm run test:mobile
```

Expected: All 6 tests PASS (3 NowServing + 3 QueueStats).

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/components/
git commit -m "feat(mobile): add NowServing, QueueStats, NextButton components with TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Firebase Hooks + Queue Actions Service

**Files:**
- Create: `apps/mobile/src/hooks/useQueue.ts`, `apps/mobile/src/hooks/useQueueEntries.ts`, `apps/mobile/src/services/queueActions.ts`

- [ ] **Step 1: Create `apps/mobile/src/hooks/useQueue.ts`**

```ts
import { useState, useEffect } from "react";
import { collection, query, limit, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Queue } from "@eazque/shared";

export function useQueue(businessId: string) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, `businesses/${businessId}/queues`),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        setQueue({ id: d.id, ...d.data() } as Queue);
        setQueueId(d.id);
      }
      setLoading(false);
    });
    return unsub;
  }, [businessId]);

  return { queue, queueId, loading };
}
```

- [ ] **Step 2: Create `apps/mobile/src/hooks/useQueueEntries.ts`**

```ts
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { QueueEntry } from "@eazque/shared";

export function useQueueEntries(
  businessId: string,
  queueId: string | null
) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!queueId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `businesses/${businessId}/queues/${queueId}/entries`),
      where("status", "in", ["waiting", "serving"])
    );
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            queueNumber: data.queueNumber,
            displayNumber: data.displayNumber,
            status: data.status,
            customerName: data.customerName,
            phone: data.phone,
            formData: data.formData ?? {},
            notes: data.notes ?? "",
            sessionToken: data.sessionToken,
            joinedAt: data.joinedAt?.toDate() ?? new Date(),
            servedAt: data.servedAt?.toDate() ?? null,
            completedAt: data.completedAt?.toDate() ?? null,
          } as QueueEntry;
        })
        .sort((a, b) => a.queueNumber - b.queueNumber);
      setEntries(sorted);
      setLoading(false);
    });
    return unsub;
  }, [businessId, queueId]);

  return { entries, loading };
}
```

- [ ] **Step 3: Create `apps/mobile/src/services/queueActions.ts`**

```ts
import {
  doc,
  writeBatch,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { QueueEntry } from "@eazque/shared";

function entryRef(businessId: string, queueId: string, entryId: string) {
  return doc(
    db,
    `businesses/${businessId}/queues/${queueId}/entries/${entryId}`
  );
}

function queueRef(businessId: string, queueId: string) {
  return doc(db, `businesses/${businessId}/queues/${queueId}`);
}

/**
 * Advance the queue: complete the currently serving entry and serve the next waiting one.
 * Pass pre-sorted entries (waiting first, by queueNumber).
 */
export async function advanceQueue(
  businessId: string,
  queueId: string,
  waitingEntries: QueueEntry[],
  servingEntryId: string | null
) {
  if (waitingEntries.length === 0) return;

  const batch = writeBatch(db);
  const nextEntry = waitingEntries[0];

  if (servingEntryId) {
    batch.update(entryRef(businessId, queueId, servingEntryId), {
      status: "completed",
      completedAt: serverTimestamp(),
    });
  }

  batch.update(entryRef(businessId, queueId, nextEntry.id), {
    status: "serving",
    servedAt: serverTimestamp(),
  });

  batch.update(queueRef(businessId, queueId), {
    currentNumber: nextEntry.queueNumber,
  });

  await batch.commit();
}

export async function skipEntry(
  businessId: string,
  queueId: string,
  entryId: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), {
    status: "skipped",
  });
}

export async function removeEntry(
  businessId: string,
  queueId: string,
  entryId: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), {
    status: "removed",
  });
}

export async function addNote(
  businessId: string,
  queueId: string,
  entryId: string,
  note: string
) {
  await updateDoc(entryRef(businessId, queueId, entryId), {
    notes: note,
  });
}
```

- [ ] **Step 4: Verify typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run existing tests**

```bash
npm run test:mobile
```

Expected: 6 tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/hooks/ apps/mobile/src/services/
git commit -m "feat(mobile): add queue hooks (real-time listeners) and queue actions service (advance, skip, remove, note)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: EntryCard + EntryList Components (TDD)

**Files:**
- Create: `apps/mobile/src/components/EntryCard.test.tsx`, `apps/mobile/src/components/EntryCard.tsx`, `apps/mobile/src/components/EntryList.tsx`

- [ ] **Step 1: Write EntryCard tests**

Create `apps/mobile/src/components/EntryCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";
import EntryCard from "./EntryCard";
import type { QueueEntry } from "@eazque/shared";

// Mock gesture handler to render children + actions directly
jest.mock("react-native-gesture-handler", () => ({
  Swipeable: ({ children, renderRightActions }: any) => (
    <>
      {children}
      {renderRightActions && renderRightActions()}
    </>
  ),
}));

const mockEntry: QueueEntry = {
  id: "e1",
  queueNumber: 1,
  displayNumber: "Q-001",
  status: "waiting",
  customerName: "John",
  phone: "+601234",
  formData: {},
  notes: "",
  sessionToken: "tok1",
  joinedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
  servedAt: null,
  completedAt: null,
};

const noop = () => {};

describe("EntryCard", () => {
  it("displays customer name and queue number", () => {
    render(
      <EntryCard entry={mockEntry} onSkip={noop} onRemove={noop} onAddNote={noop} />
    );
    expect(screen.getByText("John")).toBeTruthy();
    expect(screen.getByText("Q-001")).toBeTruthy();
  });

  it("displays time since joined", () => {
    render(
      <EntryCard entry={mockEntry} onSkip={noop} onRemove={noop} onAddNote={noop} />
    );
    expect(screen.getByText("10 min")).toBeTruthy();
  });

  it("displays notes when present", () => {
    const entryWithNotes = { ...mockEntry, notes: "VIP customer" };
    render(
      <EntryCard
        entry={entryWithNotes}
        onSkip={noop}
        onRemove={noop}
        onAddNote={noop}
      />
    );
    expect(screen.getByText("VIP customer")).toBeTruthy();
  });

  it("renders swipe action buttons", () => {
    render(
      <EntryCard entry={mockEntry} onSkip={noop} onRemove={noop} onAddNote={noop} />
    );
    expect(screen.getByText("Skip")).toBeTruthy();
    expect(screen.getByText("Remove")).toBeTruthy();
    expect(screen.getByText("Note")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: EntryCard tests FAIL — module not found.

- [ ] **Step 3: Implement EntryCard**

Create `apps/mobile/src/components/EntryCard.tsx`:

```tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { QueueEntry } from "@eazque/shared";
import { colors } from "../theme";

interface EntryCardProps {
  entry: QueueEntry;
  onSkip: (entryId: string) => void;
  onRemove: (entryId: string) => void;
  onAddNote: (entryId: string) => void;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}

export default function EntryCard({
  entry,
  onSkip,
  onRemove,
  onAddNote,
}: EntryCardProps) {
  const renderRightActions = () => (
    <View style={styles.actions}>
      <Pressable
        style={[styles.action, { backgroundColor: colors.note }]}
        onPress={() => onAddNote(entry.id)}
      >
        <Text style={styles.actionText}>Note</Text>
      </Pressable>
      <Pressable
        style={[styles.action, { backgroundColor: colors.skip }]}
        onPress={() => onSkip(entry.id)}
      >
        <Text style={styles.actionText}>Skip</Text>
      </Pressable>
      <Pressable
        style={[styles.action, { backgroundColor: colors.remove }]}
        onPress={() => onRemove(entry.id)}
      >
        <Text style={styles.actionText}>Remove</Text>
      </Pressable>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.displayNumber}>{entry.displayNumber}</Text>
          <Text style={styles.customerName}>{entry.customerName}</Text>
          <Text style={styles.time}>{formatTimeAgo(entry.joinedAt)}</Text>
        </View>
        {entry.notes ? (
          <Text style={styles.notes}>{entry.notes}</Text>
        ) : null}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  displayNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    width: 56,
  },
  customerName: {
    flex: 1,
    fontSize: 16,
    color: colors.textDark,
  },
  time: {
    fontSize: 13,
    color: colors.secondary,
  },
  notes: {
    fontSize: 13,
    color: colors.note,
    marginTop: 4,
    marginLeft: 68,
    fontStyle: "italic",
  },
  actions: {
    flexDirection: "row",
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 72,
  },
  actionText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
});
```

- [ ] **Step 4: Implement EntryList**

Create `apps/mobile/src/components/EntryList.tsx`:

```tsx
import { FlatList, View, Text, StyleSheet } from "react-native";
import type { QueueEntry } from "@eazque/shared";
import EntryCard from "./EntryCard";
import { colors } from "../theme";

interface EntryListProps {
  entries: QueueEntry[];
  onSkip: (entryId: string) => void;
  onRemove: (entryId: string) => void;
  onAddNote: (entryId: string) => void;
}

export default function EntryList({
  entries,
  onSkip,
  onRemove,
  onAddNote,
}: EntryListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No one in the queue yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <EntryCard
          entry={item}
          onSkip={onSkip}
          onRemove={onRemove}
          onAddNote={onAddNote}
        />
      )}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
    fontStyle: "italic",
  },
});
```

- [ ] **Step 5: Run all tests**

```bash
npm run test:mobile
```

Expected: All 10 tests PASS (3 NowServing + 3 QueueStats + 4 EntryCard).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/EntryCard.tsx apps/mobile/src/components/EntryCard.test.tsx apps/mobile/src/components/EntryList.tsx
git commit -m "feat(mobile): add EntryCard with swipe actions and EntryList with TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: QueueScreen Assembly + Final Verification

**Files:**
- Modify: `apps/mobile/src/screens/QueueScreen.tsx` (replace placeholder)

- [ ] **Step 1: Implement QueueScreen**

Replace the entire content of `apps/mobile/src/screens/QueueScreen.tsx`:

```tsx
import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useQueue } from "../hooks/useQueue";
import { useQueueEntries } from "../hooks/useQueueEntries";
import {
  advanceQueue,
  skipEntry,
  removeEntry,
  addNote,
} from "../services/queueActions";
import NowServing from "../components/NowServing";
import QueueStats from "../components/QueueStats";
import NextButton from "../components/NextButton";
import EntryList from "../components/EntryList";
import { colors, common } from "../theme";

export default function QueueScreen() {
  const { businessId } = useAuth();
  const { queue, queueId, loading: queueLoading } = useQueue(businessId!);
  const { entries, loading: entriesLoading } = useQueueEntries(
    businessId!,
    queueId
  );
  const [advancing, setAdvancing] = useState(false);
  const [noteEntryId, setNoteEntryId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const waitingEntries = entries.filter((e) => e.status === "waiting");
  const servingEntry = entries.find((e) => e.status === "serving");

  const handleNext = async () => {
    if (!queueId || waitingEntries.length === 0) return;
    setAdvancing(true);
    try {
      await advanceQueue(
        businessId!,
        queueId,
        waitingEntries,
        servingEntry?.id ?? null
      );
    } catch {
      Alert.alert("Error", "Failed to advance queue. Please try again.");
    } finally {
      setAdvancing(false);
    }
  };

  const handleSkip = (entryId: string) => {
    Alert.alert("Skip Customer", "Move this customer to skipped?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Skip",
        style: "destructive",
        onPress: () => skipEntry(businessId!, queueId!, entryId),
      },
    ]);
  };

  const handleRemove = (entryId: string) => {
    Alert.alert("Remove Customer", "Remove this customer from the queue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeEntry(businessId!, queueId!, entryId),
      },
    ]);
  };

  const handleSaveNote = async () => {
    if (!noteEntryId || !queueId) return;
    await addNote(businessId!, queueId, noteEntryId, noteText.trim());
    setNoteEntryId(null);
    setNoteText("");
  };

  if (queueLoading || entriesLoading) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>Loading queue...</Text>
      </View>
    );
  }

  if (!queue || !queueId) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>No queue found</Text>
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <View style={common.container}>
        <NowServing currentNumber={queue.currentNumber} />
        <QueueStats
          waitingCount={waitingEntries.length}
          avgServiceTime={queue.avgServiceTime}
        />
        <NextButton
          onPress={handleNext}
          disabled={waitingEntries.length === 0}
          loading={advancing}
        />
        <EntryList
          entries={waitingEntries}
          onSkip={handleSkip}
          onRemove={handleRemove}
          onAddNote={(id) => {
            const entry = entries.find((e) => e.id === id);
            setNoteText(entry?.notes ?? "");
            setNoteEntryId(id);
          }}
        />
      </View>

      <Modal
        visible={noteEntryId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteEntryId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput
              style={[common.input, styles.noteInput]}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Enter note..."
              placeholderTextColor={colors.secondary}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setNoteEntryId(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={common.button} onPress={handleSaveNote}>
                <Text style={common.buttonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 12,
  },
  noteInput: {
    height: 100,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: colors.secondary,
    fontSize: 16,
  },
});
```

- [ ] **Step 2: Verify typecheck**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 3: Run all mobile tests**

```bash
npm run test:mobile
```

Expected: All 10 tests PASS (3 NowServing + 3 QueueStats + 4 EntryCard).

- [ ] **Step 4: Run all project tests**

```bash
npm run test:shared && npm run test:functions && npm run test:web && npm run test:mobile
```

Expected:
- shared: 21 pass
- functions: 18 pass
- web: 11 pass
- mobile: 10 pass
- **Total: 60 tests pass**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/QueueScreen.tsx
git commit -m "feat(mobile): add QueueScreen — assembles NowServing, stats, next button, entry list with swipe actions and note modal

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | Tests Added | Components Created | Key Deliverable |
|------|-------------|-------------------|-----------------|
| 1 | 0 | 0 | Project setup: deps, Firebase client SDK, Warm Sand theme, test config |
| 2 | 0 | 1 | AuthContext (signIn/signUp/signOut), Firestore rules for owner bootstrap |
| 3 | 0 | 6 | Navigation shell: AuthStack, MainTabs, RootNavigator, Login, SignUp, Placeholder |
| 4 | 6 | 3 | NowServing (TDD) + QueueStats (TDD) + NextButton |
| 5 | 0 | 0 | 2 Firebase hooks + queue actions service (advance, skip, remove, note) |
| 6 | 4 | 2 | EntryCard with swipe (TDD) + EntryList |
| 7 | 0 | 1 | QueueScreen — assembles everything with note modal |

**Total: 10 component tests, 13 new components/modules, 7 commits**

**Screens:**
- LoginScreen → email/password login
- SignUpScreen → creates account + business + default queue
- QueueScreen → Now Serving display, stats, Next button, swipeable entry list, note modal
- PlaceholderScreen → stub for History/Analytics/Staff (Plan 5-6)

**Auth flow:**
- App opens → AuthProvider checks Firebase Auth state
- Not authenticated → LoginScreen (or SignUp)
- Authenticated with business → MainTabs → QueueScreen

**Queue flow:**
- Owner taps "Next" → completes current, serves next (batch write)
- Swipe entry left → Skip / Remove / Add Note actions
- Real-time updates via Firestore onSnapshot listeners
