# Business Logo Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let business owners upload a circular logo avatar in Settings, stored in Firebase Storage and displayed in the mobile SettingsScreen, QueueScreen header, and customer web app join page, with an initials fallback when no logo is set.

**Architecture:** The `Business.logo: string` field already exists in the data model. Firebase Storage is configured but not initialized; we add `getStorage` to the mobile Firebase config. The upload flow in SettingsScreen uses `expo-image-picker` (square crop, quality 0.7) → `uploadBytes` to `logos/{businessId}` → `getDownloadURL` → Firestore write — all triggered immediately on image selection, separate from the Settings save button. A reusable `BusinessAvatar` component handles both the image and the initials fallback.

**Tech Stack:** React Native + Expo, `expo-image-picker`, Firebase Storage (`firebase/storage`), Firestore, React Native Testing Library, Jest

---

## File Map

**New — mobile:**
- `apps/mobile/src/components/BusinessAvatar.tsx` — circular avatar: image or initials fallback, optional press/upload states
- `apps/mobile/src/components/BusinessAvatar.test.tsx` — 4 TDD tests
- `apps/mobile/src/services/logoActions.ts` — `uploadBusinessLogo(businessId, localUri)` service function

**Modified — mobile:**
- `apps/mobile/src/config/firebase.ts` — add `getStorage`, export `storage`
- `apps/mobile/src/services/settingsActions.ts` — add `logo?: string` to `BusinessSettingsUpdate`
- `apps/mobile/src/screens/SettingsScreen.tsx` — tappable avatar in Business Profile, upload handler
- `apps/mobile/src/screens/QueueScreen.tsx` — small display-only avatar in header area

**Modified — web:**
- `apps/web/src/pages/JoinQueuePage.tsx` — initials fallback helper + conditional logo/initials display
- `apps/web/src/index.css` — update `.business-logo` to circle + add `.business-initials` style

---

## Task 1: Firebase Storage Init + Install expo-image-picker

**Files:**
- Modify: `apps/mobile/src/config/firebase.ts`
- Install: `expo-image-picker` in `apps/mobile`

- [ ] **Step 1: Install expo-image-picker**

```bash
npm install expo-image-picker --workspace=apps/mobile
```

Expected: package added to `apps/mobile/package.json`.

- [ ] **Step 2: Add Firebase Storage to mobile config**

Read `apps/mobile/src/config/firebase.ts`. Replace its contents with:

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
import { getStorage } from "firebase/storage";
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
export const storage = getStorage(app);

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

- [ ] **Step 3: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 33 tests PASS. If any fail, fix before proceeding.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/config/firebase.ts apps/mobile/package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(mobile): initialize Firebase Storage and install expo-image-picker

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: BusinessAvatar Component (TDD)

**Files:**
- Create: `apps/mobile/src/components/BusinessAvatar.test.tsx`
- Create: `apps/mobile/src/components/BusinessAvatar.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/components/BusinessAvatar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import BusinessAvatar from "./BusinessAvatar";

describe("BusinessAvatar", () => {
  it("renders an image when uri is provided", () => {
    render(
      <BusinessAvatar uri="https://example.com/logo.jpg" name="My Cafe" size={72} />
    );
    expect(screen.getByTestId("business-avatar-image")).toBeTruthy();
    expect(screen.queryByText("MC")).toBeNull();
  });

  it("renders initials when no uri provided", () => {
    render(<BusinessAvatar name="My Cafe" size={72} />);
    expect(screen.queryByTestId("business-avatar-image")).toBeNull();
    expect(screen.getByText("MC")).toBeTruthy();
  });

  it("shows one initial for a single-word name", () => {
    render(<BusinessAvatar name="Cafe" size={72} />);
    expect(screen.getByText("C")).toBeTruthy();
  });

  it("shows two initials for a multi-word name (first two words)", () => {
    render(<BusinessAvatar name="My Awesome Cafe" size={72} />);
    expect(screen.getByText("MA")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: 4 `BusinessAvatar` tests FAIL — module not found.

- [ ] **Step 3: Implement BusinessAvatar**

Create `apps/mobile/src/components/BusinessAvatar.tsx`:

```tsx
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
```

- [ ] **Step 4: Run all mobile tests**

```bash
npm run test:mobile
```

Expected: 37 tests PASS (33 existing + 4 new BusinessAvatar). Fix any failures before proceeding.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/BusinessAvatar.tsx apps/mobile/src/components/BusinessAvatar.test.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): add BusinessAvatar component with TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: logoActions Service

**Files:**
- Modify: `apps/mobile/src/services/settingsActions.ts` (add `logo` field)
- Create: `apps/mobile/src/services/logoActions.ts`

- [ ] **Step 1: Add `logo` to BusinessSettingsUpdate**

Read `apps/mobile/src/services/settingsActions.ts`. Add `logo?: string` to the `BusinessSettingsUpdate` interface:

```ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import type { FormField } from "@eazque/shared";

interface BusinessSettingsUpdate {
  name?: string;
  logo?: string;
  primaryColor?: string;
  whatsappNumber?: string;
  whatsappApiKey?: string;
  defaultEstimatedTimePerCustomer?: number;
  approachingThreshold?: number;
  formFields?: FormField[];
}

export async function updateBusinessSettings(
  businessId: string,
  updates: BusinessSettingsUpdate
) {
  await updateDoc(doc(db, "businesses", businessId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}
```

- [ ] **Step 2: Create logoActions service**

Create `apps/mobile/src/services/logoActions.ts`:

```ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../config/firebase";
import { updateBusinessSettings } from "./settingsActions";

export async function uploadBusinessLogo(
  businessId: string,
  localUri: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `logos/${businessId}`);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  await updateBusinessSettings(businessId, { logo: url });
  return url;
}
```

- [ ] **Step 3: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 37 tests PASS (no new tests for this task — Firebase Storage wrappers are not unit tested).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/settingsActions.ts apps/mobile/src/services/logoActions.ts
git commit -m "$(cat <<'EOF'
feat(mobile): add uploadBusinessLogo service and logo field to settings update

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: SettingsScreen Logo Upload UI

**Files:**
- Modify: `apps/mobile/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Read the current file**

Read `apps/mobile/src/screens/SettingsScreen.tsx` in full to understand the current structure.

- [ ] **Step 2: Add imports**

At the top of `SettingsScreen.tsx`, add these imports alongside the existing ones:

```tsx
import * as ImagePicker from "expo-image-picker";
import BusinessAvatar from "../components/BusinessAvatar";
import { uploadBusinessLogo } from "../services/logoActions";
```

- [ ] **Step 3: Add logoUri and uploading state**

After the existing `const [dirty, setDirty] = useState(false);` line, add:

```tsx
const [logoUri, setLogoUri] = useState("");
const [uploading, setUploading] = useState(false);
```

- [ ] **Step 4: Seed logoUri from business in the existing useEffect**

In the existing `useEffect` that seeds state from `business`, add `setLogoUri(business.logo ?? "");` after the other setters:

```tsx
useEffect(() => {
  if (business) {
    setName(business.name);
    setPrimaryColor(business.primaryColor);
    setWhatsappNumber(business.whatsappNumber);
    setWhatsappApiKey(business.whatsappApiKey);
    setEstimatedTime(String(business.defaultEstimatedTimePerCustomer));
    setThreshold(String(business.approachingThreshold));
    setFormFields(business.formFields ?? []);
    setLogoUri(business.logo ?? "");
    setDirty(false);
  }
}, [business]);
```

- [ ] **Step 5: Add the handleLogoPress function**

Add this function after the `markDirty` callback definition:

```tsx
const handleLogoPress = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) return;

  const previousUri = logoUri;
  const localUri = result.assets[0].uri;
  setLogoUri(localUri);
  setUploading(true);

  try {
    const url = await uploadBusinessLogo(businessId!, localUri);
    setLogoUri(url);
  } catch {
    Alert.alert("Error", "Failed to upload logo. Please try again.");
    setLogoUri(previousUri);
  } finally {
    setUploading(false);
  }
};
```

- [ ] **Step 6: Add BusinessAvatar to the Business Profile section**

In the JSX, find the Business Profile section which starts with:
```tsx
{/* Business Profile */}
<Text style={styles.sectionTitle}>Business Profile</Text>

<Text style={styles.label}>Business Name</Text>
```

Replace it with:
```tsx
{/* Business Profile */}
<Text style={styles.sectionTitle}>Business Profile</Text>

<View style={styles.avatarRow}>
  <BusinessAvatar
    uri={logoUri || undefined}
    name={name || business.name}
    size={72}
    onPress={handleLogoPress}
    uploading={uploading}
  />
  <Text style={styles.avatarHint}>Tap to change photo</Text>
</View>

<Text style={styles.label}>Business Name</Text>
```

- [ ] **Step 7: Add avatarRow and avatarHint to StyleSheet**

In the existing `StyleSheet.create({...})` at the bottom of the file, add:

```tsx
avatarRow: {
  alignItems: "center",
  marginBottom: 20,
},
avatarHint: {
  fontSize: 12,
  color: colors.secondary,
  marginTop: 6,
},
```

- [ ] **Step 8: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 37 tests PASS. Fix any failures before proceeding.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/screens/SettingsScreen.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): add logo upload UI to SettingsScreen

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: QueueScreen Avatar Display

**Files:**
- Modify: `apps/mobile/src/screens/QueueScreen.tsx`

- [ ] **Step 1: Read the current file**

Read `apps/mobile/src/screens/QueueScreen.tsx` in full.

- [ ] **Step 2: Add imports**

Add these imports to the existing import block:

```tsx
import BusinessAvatar from "../components/BusinessAvatar";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
```

- [ ] **Step 3: Add useBusinessSettings call**

After `const { businessId } = useAuth();`, add:

```tsx
const { business } = useBusinessSettings(businessId!);
```

- [ ] **Step 4: Add avatar to the screen header area**

In the JSX, find the main content view which currently starts with:
```tsx
<View style={common.container}>
  <NowServing currentNumber={queue.currentNumber} />
```

Replace it with:
```tsx
<View style={common.container}>
  {business && (
    <View style={styles.avatarHeader}>
      <BusinessAvatar
        uri={business.logo || undefined}
        name={business.name}
        size={32}
      />
      <Text style={styles.businessName}>{business.name}</Text>
    </View>
  )}
  <NowServing currentNumber={queue.currentNumber} />
```

- [ ] **Step 5: Add avatarHeader and businessName styles**

In the existing `StyleSheet.create({...})` at the bottom of QueueScreen.tsx, add:

```tsx
avatarHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
},
businessName: {
  fontSize: 14,
  fontWeight: "600",
  color: colors.textDark,
},
```

- [ ] **Step 6: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 37 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/screens/QueueScreen.tsx
git commit -m "$(cat <<'EOF'
feat(mobile): add BusinessAvatar to QueueScreen header

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Web App Circular Logo + Initials Fallback

**Files:**
- Modify: `apps/web/src/pages/JoinQueuePage.tsx`
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Update the CSS**

Read `apps/web/src/index.css`. Find the `.business-logo` block (around line 39):

```css
.business-logo {
  display: block;
  max-width: 80px;
  max-height: 80px;
  margin: 0 auto 0.75rem;
  border-radius: 12px;
```

Replace the entire `.business-logo` block with:

```css
.business-logo {
  display: block;
  width: 72px;
  height: 72px;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  object-fit: cover;
}

.business-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 1.75rem;
  font-weight: 700;
}
```

- [ ] **Step 2: Add helpers and update JoinQueuePage JSX**

Read `apps/web/src/pages/JoinQueuePage.tsx`. Add these two helper functions before the `JoinQueuePage` component definition:

```tsx
const INITIALS_COLORS = [
  "#B8926A", "#8B6F47", "#A0845C", "#C4A882", "#6B5240", "#D4956A",
];

function getWebInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "?";
  return (words[0][0]?.toUpperCase() ?? "") + (words[1][0]?.toUpperCase() ?? "");
}

function getWebInitialsColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}
```

Then find the existing logo block in the JSX:

```tsx
{business.logo && (
  <img src={business.logo} alt={business.name} className="business-logo" />
)}
```

Replace it with:

```tsx
{business.logo ? (
  <img src={business.logo} alt={business.name} className="business-logo" />
) : (
  <div
    className="business-logo business-initials"
    style={{ backgroundColor: getWebInitialsColor(business.name) }}
  >
    {getWebInitials(business.name)}
  </div>
)}
```

- [ ] **Step 3: Run all tests**

```bash
npm run test:shared && npm run test:functions && npm run test:web && npm run test:mobile
```

Expected:
- shared: 21 pass
- functions: 23 pass
- web: 11 pass
- mobile: 37 pass
- **Total: 92 tests pass**

Fix any failures before proceeding.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/JoinQueuePage.tsx apps/web/src/index.css
git commit -m "$(cat <<'EOF'
feat(web): circular business logo with initials fallback on join page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```
