# Plan 5: Settings + Staff Management — Business Mobile App

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Settings screen and Staff management tab for business owners — edit business profile, queue defaults, custom form fields, and manage staff members. Non-owner staff see neither.

**Architecture:** Settings is a screen pushed on top of the tab navigator via a new AppStack. Staff tab is conditionally rendered for owners only. AuthContext is extended with `role` to gate owner-only UI. Pure components (StaffCard, FormFieldItem) are TDD tested. Firebase hooks and service functions follow existing patterns from Plan 4.

**Tech Stack:** Expo SDK 54, React Native 0.81, React Navigation 7, Firebase JS SDK 11, react-native-draggable-flatlist, react-native-gesture-handler (Swipeable), Jest + React Native Testing Library, @eazque/shared

---

## File Structure

### New files to create:

```
packages/shared/src/types.ts                          # Modify: add status to Staff
packages/shared/src/constants.ts                      # Modify: add STAFF_STATUSES
apps/mobile/src/navigation/AppStack.tsx               # Wraps MainTabs + SettingsScreen
apps/mobile/src/screens/SettingsScreen.tsx             # Business settings editor
apps/mobile/src/screens/StaffScreen.tsx                # Staff management
apps/mobile/src/components/StaffCard.tsx               # Staff member display with swipe
apps/mobile/src/components/StaffCard.test.tsx          # TDD tests
apps/mobile/src/components/StaffList.tsx               # FlatList wrapper
apps/mobile/src/components/FormFieldItem.tsx           # Form field display with controls
apps/mobile/src/components/FormFieldItem.test.tsx      # TDD tests
apps/mobile/src/components/FormFieldEditorModal.tsx    # Edit/create form field modal
apps/mobile/src/hooks/useBusinessSettings.ts           # Real-time business doc listener
apps/mobile/src/hooks/useStaff.ts                      # Real-time staff collection listener
apps/mobile/src/services/settingsActions.ts            # updateBusinessSettings
apps/mobile/src/services/staffActions.ts               # addStaffMember, removeStaffMember
```

### Files to modify:

```
apps/mobile/package.json                               # Add react-native-draggable-flatlist
apps/mobile/src/contexts/AuthContext.tsx                # Add role to state
apps/mobile/src/navigation/MainTabs.tsx                # Conditional Staff tab, gear icon
apps/mobile/src/navigation/RootNavigator.tsx           # Render AppStack instead of MainTabs
```

### Responsibilities:

| File | Responsibility |
|------|---------------|
| `AppStack.tsx` | Native stack wrapping MainTabs + SettingsScreen |
| `SettingsScreen.tsx` | ScrollView form: business profile, queue defaults, form fields with drag-reorder |
| `StaffScreen.tsx` | Staff list with add modal, swipe-to-remove |
| `StaffCard.tsx` | Pure component: name, email, role badge, status badge |
| `StaffList.tsx` | FlatList of StaffCards with empty state |
| `FormFieldItem.tsx` | Pure component: field label, type, required, reorder controls |
| `FormFieldEditorModal.tsx` | Modal: create/edit a FormField (label, type, required, dropdown options) |
| `useBusinessSettings.ts` | Hook: real-time Firestore listener on business doc |
| `useStaff.ts` | Hook: real-time listener on staff subcollection |
| `settingsActions.ts` | Service: updateBusinessSettings |
| `staffActions.ts` | Service: addStaffMember, removeStaffMember |

---

## Task 1: Shared Type + Constants Update

**Files:**
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/constants.ts`

- [ ] **Step 1: Add `status` to Staff interface**

In `packages/shared/src/types.ts`, update the `Staff` interface. Add `status` after `role`:

```ts
export interface Staff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  status: StaffStatus;
  createdAt: Date;
}
```

Also add the import at the top of the file — update the existing import line:

```ts
import type { FieldType, EntryStatus, QueueStatus, StaffRole, StaffStatus } from "./constants";
```

- [ ] **Step 2: Add `STAFF_STATUSES` to constants**

In `packages/shared/src/constants.ts`, add after the `STAFF_ROLES` block:

```ts
export const STAFF_STATUSES = ["active", "pending"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];
```

- [ ] **Step 3: Run shared tests**

```bash
npm run test:shared
```

Expected: 21 tests PASS (no test changes needed — Staff is a type, not validated by existing tests).

- [ ] **Step 4: Update AuthContext signUp to include status**

In `apps/mobile/src/contexts/AuthContext.tsx`, update the owner staff doc creation (the `setDoc` call for the staff doc) to include `status: "active"`:

Replace:
```ts
      await setDoc(doc(db, `businesses/${uid}/staff/${uid}`), {
        email,
        name: businessName,
        role: "owner",
        createdAt: serverTimestamp(),
      });
```

With:
```ts
      await setDoc(doc(db, `businesses/${uid}/staff/${uid}`), {
        email,
        name: businessName,
        role: "owner",
        status: "active",
        createdAt: serverTimestamp(),
      });
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/constants.ts apps/mobile/src/contexts/AuthContext.tsx
git commit -m "feat(shared): add StaffStatus type and update Staff interface with status field

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: AuthContext — Add Role to State

**Files:**
- Modify: `apps/mobile/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Update AuthState and AuthContextValue**

Replace the `AuthState` interface:

```ts
interface AuthState {
  user: User | null;
  businessId: string | null;
  role: "owner" | "staff" | null;
  loading: boolean;
}
```

No change needed to `AuthContextValue` — it extends `AuthState` and already exposes all fields.

- [ ] **Step 2: Update initial state**

Replace the initial state in `useState`:

```ts
  const [state, setState] = useState<AuthState>({
    user: null,
    businessId: null,
    role: null,
    loading: true,
  });
```

- [ ] **Step 3: Update onAuthStateChanged to fetch role**

Replace the `onAuthStateChanged` callback body:

```ts
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (signingUpRef.current) return;

      if (user) {
        const bizDoc = await getDoc(doc(db, "businesses", user.uid));
        if (bizDoc.exists()) {
          // User owns this business — fetch their staff doc for role
          const staffDoc = await getDoc(
            doc(db, `businesses/${user.uid}/staff/${user.uid}`)
          );
          const role = staffDoc.exists()
            ? (staffDoc.data().role as "owner" | "staff")
            : null;
          setState({ user, businessId: user.uid, role, loading: false });
        } else {
          setState({ user, businessId: null, role: null, loading: false });
        }
      } else {
        setState({ user: null, businessId: null, role: null, loading: false });
      }
    });
```

- [ ] **Step 4: Update signUp setState**

Replace the `setState` at the end of `signUp`:

```ts
      setState({ user: cred.user, businessId: uid, role: "owner", loading: false });
```

- [ ] **Step 5: Update signOut reset**

The `onAuthStateChanged` listener already handles the signOut case by setting `role: null` when user is null. No additional change needed.

- [ ] **Step 6: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 10 tests PASS. No test changes — tests don't exercise AuthContext directly.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/contexts/AuthContext.tsx
git commit -m "feat(mobile): add role to AuthContext state for owner-only UI gating

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Navigation Restructure — AppStack + Gear Icon

**Files:**
- Create: `apps/mobile/src/navigation/AppStack.tsx`
- Modify: `apps/mobile/src/navigation/MainTabs.tsx`
- Modify: `apps/mobile/src/navigation/RootNavigator.tsx`
- Create: `apps/mobile/src/screens/SettingsScreen.tsx` (placeholder)
- Create: `apps/mobile/src/screens/StaffScreen.tsx` (placeholder)

- [ ] **Step 1: Create SettingsScreen placeholder**

Create `apps/mobile/src/screens/SettingsScreen.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, common } from "../theme";

export default function SettingsScreen() {
  return (
    <View style={[common.screen, styles.center]}>
      <Text style={styles.text}>Settings</Text>
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

- [ ] **Step 2: Create StaffScreen placeholder**

Create `apps/mobile/src/screens/StaffScreen.tsx`:

```tsx
import { View, Text, StyleSheet } from "react-native";
import { colors, common } from "../theme";

export default function StaffScreen() {
  return (
    <View style={[common.screen, styles.center]}>
      <Text style={styles.text}>Staff</Text>
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

- [ ] **Step 3: Create AppStack**

Create `apps/mobile/src/navigation/AppStack.tsx`:

```tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "./MainTabs";
import SettingsScreen from "../screens/SettingsScreen";
import { colors } from "../theme";

const Stack = createNativeStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textDark,
        }}
      />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 4: Update MainTabs — conditional Staff tab + gear icon**

Replace the entire `apps/mobile/src/navigation/MainTabs.tsx`:

```tsx
import { Pressable } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import QueueScreen from "../screens/QueueScreen";
import StaffScreen from "../screens/StaffScreen";
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
      <Tab.Screen name="History" component={PlaceholderScreen} />
      <Tab.Screen name="Analytics" component={PlaceholderScreen} />
      {isOwner && (
        <Tab.Screen name="Staff" component={StaffScreen} />
      )}
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Update RootNavigator to use AppStack**

Replace the entire `apps/mobile/src/navigation/RootNavigator.tsx`:

```tsx
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import AuthStack from "./AuthStack";
import AppStack from "./AppStack";
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

  return <AppStack />;
}
```

- [ ] **Step 6: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 10 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/navigation/ apps/mobile/src/screens/SettingsScreen.tsx apps/mobile/src/screens/StaffScreen.tsx
git commit -m "feat(mobile): add AppStack navigation, gear icon for settings, conditional Staff tab

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Add Dependency + Hooks + Service Functions

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/src/hooks/useBusinessSettings.ts`
- Create: `apps/mobile/src/hooks/useStaff.ts`
- Create: `apps/mobile/src/services/settingsActions.ts`
- Create: `apps/mobile/src/services/staffActions.ts`

- [ ] **Step 1: Add react-native-draggable-flatlist dependency**

Add to `apps/mobile/package.json` dependencies:

```json
"react-native-draggable-flatlist": "^4.0.0"
```

Then run:

```bash
npm install
```

- [ ] **Step 2: Create useBusinessSettings hook**

Create `apps/mobile/src/hooks/useBusinessSettings.ts`:

```ts
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Business } from "@eazque/shared";

export function useBusinessSettings(businessId: string) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "businesses", businessId),
      (snap) => {
        if (snap.exists()) {
          setBusiness({ id: snap.id, ...snap.data() } as Business);
        }
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  return { business, loading };
}
```

- [ ] **Step 3: Create useStaff hook**

Create `apps/mobile/src/hooks/useStaff.ts`:

```ts
import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Staff } from "@eazque/shared";

export function useStaff(businessId: string) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, `businesses/${businessId}/staff`),
      (snap) => {
        const members = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate() ?? new Date(),
        })) as Staff[];
        setStaff(members);
        setLoading(false);
      }
    );
    return unsub;
  }, [businessId]);

  return { staff, loading };
}
```

- [ ] **Step 4: Create settingsActions service**

Create `apps/mobile/src/services/settingsActions.ts`:

```ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import type { FormField } from "@eazque/shared";

interface BusinessSettingsUpdate {
  name?: string;
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

- [ ] **Step 5: Create staffActions service**

Create `apps/mobile/src/services/staffActions.ts`:

```ts
import { addDoc, deleteDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export async function addStaffMember(
  businessId: string,
  email: string,
  name: string
) {
  await addDoc(collection(db, `businesses/${businessId}/staff`), {
    email,
    name,
    role: "staff",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function removeStaffMember(
  businessId: string,
  staffId: string
) {
  await deleteDoc(doc(db, `businesses/${businessId}/staff/${staffId}`));
}
```

- [ ] **Step 6: Run mobile tests**

```bash
npm run test:mobile
```

Expected: 10 tests PASS (no new test files in this task).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/package.json apps/mobile/src/hooks/useBusinessSettings.ts apps/mobile/src/hooks/useStaff.ts apps/mobile/src/services/settingsActions.ts apps/mobile/src/services/staffActions.ts package-lock.json
git commit -m "feat(mobile): add business settings and staff hooks and service functions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: StaffCard + StaffList Components (TDD)

**Files:**
- Create: `apps/mobile/src/components/StaffCard.test.tsx`, `apps/mobile/src/components/StaffCard.tsx`, `apps/mobile/src/components/StaffList.tsx`

- [ ] **Step 1: Write StaffCard tests**

Create `apps/mobile/src/components/StaffCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";
import StaffCard from "./StaffCard";
import type { Staff } from "@eazque/shared";

jest.mock("react-native-gesture-handler", () => ({
  Swipeable: ({ children, renderRightActions }: any) => (
    <>
      {children}
      {renderRightActions && renderRightActions()}
    </>
  ),
}));

const mockOwner: Staff = {
  id: "uid1",
  email: "owner@test.com",
  name: "Alice",
  role: "owner",
  status: "active",
  createdAt: new Date(),
};

const mockStaff: Staff = {
  id: "uid2",
  email: "staff@test.com",
  name: "Bob",
  role: "staff",
  status: "pending",
  createdAt: new Date(),
};

const noop = () => {};

describe("StaffCard", () => {
  it("displays name and email", () => {
    render(<StaffCard member={mockOwner} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("owner@test.com")).toBeTruthy();
  });

  it("displays role badge", () => {
    render(<StaffCard member={mockOwner} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Owner")).toBeTruthy();
  });

  it("displays pending status badge", () => {
    render(<StaffCard member={mockStaff} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Pending")).toBeTruthy();
  });

  it("shows remove action for non-current-user staff", () => {
    render(<StaffCard member={mockStaff} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Remove")).toBeTruthy();
  });

  it("does not show remove action for current user", () => {
    render(<StaffCard member={mockOwner} onRemove={noop} isCurrentUser={true} />);
    expect(screen.queryByText("Remove")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: StaffCard tests FAIL — module not found. Existing 10 tests still pass.

- [ ] **Step 3: Implement StaffCard**

Create `apps/mobile/src/components/StaffCard.tsx`:

```tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { Staff } from "@eazque/shared";
import { colors } from "../theme";

interface StaffCardProps {
  member: Staff;
  onRemove: (staffId: string) => void;
  isCurrentUser: boolean;
}

export default function StaffCard({
  member,
  onRemove,
  isCurrentUser,
}: StaffCardProps) {
  const renderRightActions = () => {
    if (isCurrentUser) return null;
    return (
      <View style={styles.actions}>
        <Pressable
          style={[styles.action, { backgroundColor: colors.remove }]}
          onPress={() => onRemove(member.id)}
        >
          <Text style={styles.actionText}>Remove</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.name}>{member.name}</Text>
            <Text style={styles.email}>{member.email}</Text>
          </View>
          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    member.role === "owner"
                      ? colors.primary
                      : colors.secondary,
                },
              ]}
            >
              <Text style={styles.badgeText}>
                {member.role === "owner" ? "Owner" : "Staff"}
              </Text>
            </View>
            {member.status === "pending" && (
              <View style={[styles.badge, { backgroundColor: colors.skip }]}>
                <Text style={styles.badgeText}>Pending</Text>
              </View>
            )}
          </View>
        </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textDark,
  },
  email: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "600",
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

- [ ] **Step 4: Implement StaffList**

Create `apps/mobile/src/components/StaffList.tsx`:

```tsx
import { FlatList, View, Text, StyleSheet } from "react-native";
import type { Staff } from "@eazque/shared";
import StaffCard from "./StaffCard";
import { colors } from "../theme";

interface StaffListProps {
  staff: Staff[];
  currentUserId: string;
  onRemove: (staffId: string) => void;
}

export default function StaffList({
  staff,
  currentUserId,
  onRemove,
}: StaffListProps) {
  if (staff.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No staff members yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={staff}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <StaffCard
          member={item}
          onRemove={onRemove}
          isCurrentUser={item.id === currentUserId}
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

Expected: All 15 tests PASS (10 existing + 5 StaffCard).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/StaffCard.tsx apps/mobile/src/components/StaffCard.test.tsx apps/mobile/src/components/StaffList.tsx
git commit -m "feat(mobile): add StaffCard with swipe actions and StaffList with TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: FormFieldItem Component (TDD)

**Files:**
- Create: `apps/mobile/src/components/FormFieldItem.test.tsx`, `apps/mobile/src/components/FormFieldItem.tsx`

- [ ] **Step 1: Write FormFieldItem tests**

Create `apps/mobile/src/components/FormFieldItem.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";
import FormFieldItem from "./FormFieldItem";
import type { FormField } from "@eazque/shared";

const mockField: FormField = {
  id: "f1",
  type: "text",
  label: "Full Name",
  required: true,
};

const noop = () => {};

describe("FormFieldItem", () => {
  it("displays field label and type", () => {
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    expect(screen.getByText("Full Name")).toBeTruthy();
    expect(screen.getByText("text")).toBeTruthy();
  });

  it("shows required indicator", () => {
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("does not show required indicator when optional", () => {
    const optionalField = { ...mockField, required: false };
    render(
      <FormFieldItem
        field={optionalField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    expect(screen.queryByText("Required")).toBeNull();
  });

  it("calls onEdit when edit button pressed", () => {
    const onEdit = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={onEdit}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    fireEvent.press(screen.getByLabelText("Edit field"));
    expect(onEdit).toHaveBeenCalledWith("f1");
  });

  it("calls onDelete when delete button pressed", () => {
    const onDelete = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={onDelete}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    fireEvent.press(screen.getByLabelText("Delete field"));
    expect(onDelete).toHaveBeenCalledWith("f1");
  });

  it("disables move up when first item", () => {
    const onMoveUp = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={onMoveUp}
        onMoveDown={noop}
      />
    );
    fireEvent.press(screen.getByLabelText("Move up"));
    expect(onMoveUp).not.toHaveBeenCalled();
  });

  it("disables move down when last item", () => {
    const onMoveDown = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={2}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={onMoveDown}
      />
    );
    fireEvent.press(screen.getByLabelText("Move down"));
    expect(onMoveDown).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:mobile
```

Expected: FormFieldItem tests FAIL — module not found.

- [ ] **Step 3: Implement FormFieldItem**

Create `apps/mobile/src/components/FormFieldItem.tsx`:

```tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { FormField } from "@eazque/shared";
import { colors } from "../theme";

interface FormFieldItemProps {
  field: FormField;
  index: number;
  totalCount: number;
  onEdit: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  onMoveUp: (fieldId: string) => void;
  onMoveDown: (fieldId: string) => void;
}

export default function FormFieldItem({
  field,
  index,
  totalCount,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FormFieldItemProps) {
  const isFirst = index === 0;
  const isLast = index === totalCount - 1;

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.meta}>
          <Text style={styles.type}>{field.type}</Text>
          {field.required && <Text style={styles.required}>Required</Text>}
        </View>
      </View>
      <View style={styles.controls}>
        <Pressable
          onPress={() => !isFirst && onMoveUp(field.id)}
          accessibilityLabel="Move up"
          style={[styles.iconButton, isFirst && styles.iconDisabled]}
        >
          <Ionicons
            name="chevron-up"
            size={18}
            color={isFirst ? colors.lightAccent : colors.textDark}
          />
        </Pressable>
        <Pressable
          onPress={() => !isLast && onMoveDown(field.id)}
          accessibilityLabel="Move down"
          style={[styles.iconButton, isLast && styles.iconDisabled]}
        >
          <Ionicons
            name="chevron-down"
            size={18}
            color={isLast ? colors.lightAccent : colors.textDark}
          />
        </Pressable>
        <Pressable
          onPress={() => onEdit(field.id)}
          accessibilityLabel="Edit field"
          style={styles.iconButton}
        >
          <Ionicons name="pencil" size={18} color={colors.note} />
        </Pressable>
        <Pressable
          onPress={() => onDelete(field.id)}
          accessibilityLabel="Delete field"
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={18} color={colors.remove} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textDark,
  },
  meta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  type: {
    fontSize: 12,
    color: colors.secondary,
  },
  required: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  controls: {
    flexDirection: "row",
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  iconDisabled: {
    opacity: 0.3,
  },
});
```

- [ ] **Step 4: Run all tests**

```bash
npm run test:mobile
```

Expected: All 22 tests PASS (10 existing + 5 StaffCard + 7 FormFieldItem).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/FormFieldItem.tsx apps/mobile/src/components/FormFieldItem.test.tsx
git commit -m "feat(mobile): add FormFieldItem with reorder and edit/delete controls with TDD

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: FormFieldEditorModal

**Files:**
- Create: `apps/mobile/src/components/FormFieldEditorModal.tsx`

- [ ] **Step 1: Implement FormFieldEditorModal**

Create `apps/mobile/src/components/FormFieldEditorModal.tsx`:

```tsx
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Switch,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FIELD_TYPES, type FieldType } from "@eazque/shared";
import type { FormField } from "@eazque/shared";
import { colors, common } from "../theme";

interface FormFieldEditorModalProps {
  visible: boolean;
  field: FormField | null; // null = creating new
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

export default function FormFieldEditorModal({
  visible,
  field,
  onSave,
  onCancel,
}: FormFieldEditorModalProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");

  useEffect(() => {
    if (field) {
      setLabel(field.label);
      setType(field.type);
      setRequired(field.required);
      setOptions(field.options ?? []);
    } else {
      setLabel("");
      setType("text");
      setRequired(false);
      setOptions([]);
    }
    setNewOption("");
  }, [field, visible]);

  const handleSave = () => {
    if (!label.trim()) return;
    if (type === "dropdown" && options.length === 0) return;

    onSave({
      id: field?.id ?? Date.now().toString(),
      label: label.trim(),
      type,
      required,
      options: type === "dropdown" ? options : undefined,
    });
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ScrollView>
            <Text style={styles.title}>
              {field ? "Edit Field" : "Add Field"}
            </Text>

            <Text style={styles.inputLabel}>Label</Text>
            <TextInput
              style={common.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Field label"
              placeholderTextColor={colors.secondary}
              autoFocus
            />

            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeRow}>
              {FIELD_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.typeChip,
                    type === t && styles.typeChipActive,
                  ]}
                  onPress={() => setType(t)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === t && styles.typeChipTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Required</Text>
              <Switch
                value={required}
                onValueChange={setRequired}
                trackColor={{ true: colors.primary, false: colors.lightAccent }}
                thumbColor={colors.white}
              />
            </View>

            {type === "dropdown" && (
              <View style={styles.optionsSection}>
                <Text style={styles.inputLabel}>Options</Text>
                {options.map((opt, i) => (
                  <View key={i} style={styles.optionRow}>
                    <Text style={styles.optionText}>{opt}</Text>
                    <Pressable onPress={() => handleRemoveOption(i)}>
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={colors.remove}
                      />
                    </Pressable>
                  </View>
                ))}
                <View style={styles.addOptionRow}>
                  <TextInput
                    style={[common.input, styles.optionInput]}
                    value={newOption}
                    onChangeText={setNewOption}
                    placeholder="New option"
                    placeholderTextColor={colors.secondary}
                    onSubmitEditing={handleAddOption}
                  />
                  <Pressable
                    style={styles.addOptionButton}
                    onPress={handleAddOption}
                  >
                    <Ionicons name="add" size={24} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={common.button} onPress={handleSave}>
              <Text style={common.buttonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textDark,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    color: colors.textDark,
  },
  typeChipTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  optionsSection: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 6,
  },
  optionText: {
    fontSize: 14,
    color: colors.textDark,
  },
  addOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionInput: {
    flex: 1,
    marginBottom: 0,
  },
  addOptionButton: {
    padding: 8,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
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

- [ ] **Step 2: Run tests**

```bash
npm run test:mobile
```

Expected: 22 tests still PASS (no new tests for this modal — it's a stateful form component).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/FormFieldEditorModal.tsx
git commit -m "feat(mobile): add FormFieldEditorModal for creating and editing form fields

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: StaffScreen Implementation

**Files:**
- Modify: `apps/mobile/src/screens/StaffScreen.tsx` (replace placeholder)

- [ ] **Step 1: Implement StaffScreen**

Replace the entire content of `apps/mobile/src/screens/StaffScreen.tsx`:

```tsx
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useStaff } from "../hooks/useStaff";
import { addStaffMember, removeStaffMember } from "../services/staffActions";
import StaffList from "../components/StaffList";
import { colors, common } from "../theme";

export default function StaffScreen() {
  const { businessId, user } = useAuth();
  const { staff, loading } = useStaff(businessId!);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleRemove = (staffId: string) => {
    const member = staff.find((s) => s.id === staffId);
    Alert.alert(
      "Remove Staff",
      `Remove ${member?.name ?? "this staff member"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeStaffMember(businessId!, staffId),
        },
      ]
    );
  };

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();

    if (!email || !name) {
      Alert.alert("Error", "Please enter both email and name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (staff.some((s) => s.email === email)) {
      Alert.alert("Error", "A staff member with this email already exists.");
      return;
    }

    setAdding(true);
    try {
      await addStaffMember(businessId!, email, name);
      setShowAddModal(false);
      setNewEmail("");
      setNewName("");
    } catch {
      Alert.alert("Error", "Failed to add staff member. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>Loading staff...</Text>
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <View style={styles.header}>
        <Text style={common.title}>Team Members</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          accessibilityLabel="Add staff"
        >
          <Ionicons name="person-add" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <StaffList
        staff={staff}
        currentUserId={user?.uid ?? ""}
        onRemove={handleRemove}
      />

      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Staff Member</Text>
            <TextInput
              style={common.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="Name"
              placeholderTextColor={colors.secondary}
              autoFocus
              accessibilityLabel="Staff name"
            />
            <TextInput
              style={common.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Email"
              placeholderTextColor={colors.secondary}
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Staff email"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[common.button, adding && common.buttonDisabled]}
                onPress={handleAdd}
                disabled={adding}
              >
                <Text style={common.buttonText}>
                  {adding ? "Adding..." : "Add"}
                </Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButton: {
    padding: 8,
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

- [ ] **Step 2: Run tests**

```bash
npm run test:mobile
```

Expected: 22 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/StaffScreen.tsx
git commit -m "feat(mobile): implement StaffScreen with add modal, list, and swipe-to-remove

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: SettingsScreen Implementation

**Files:**
- Modify: `apps/mobile/src/screens/SettingsScreen.tsx` (replace placeholder)

- [ ] **Step 1: Implement SettingsScreen**

Replace the entire content of `apps/mobile/src/screens/SettingsScreen.tsx`:

```tsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useAuth } from "../contexts/AuthContext";
import { useBusinessSettings } from "../hooks/useBusinessSettings";
import { updateBusinessSettings } from "../services/settingsActions";
import FormFieldItem from "../components/FormFieldItem";
import FormFieldEditorModal from "../components/FormFieldEditorModal";
import type { FormField } from "@eazque/shared";
import { colors, common } from "../theme";

export default function SettingsScreen({ navigation }: any) {
  const { businessId } = useAuth();
  const { business, loading } = useBusinessSettings(businessId!);

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappApiKey, setWhatsappApiKey] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [threshold, setThreshold] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setPrimaryColor(business.primaryColor);
      setWhatsappNumber(business.whatsappNumber);
      setWhatsappApiKey(business.whatsappApiKey);
      setEstimatedTime(String(business.defaultEstimatedTimePerCustomer));
      setThreshold(String(business.approachingThreshold));
      setFormFields(business.formFields ?? []);
      setDirty(false);
    }
  }, [business]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (!dirty) return;
      e.preventDefault();
      Alert.alert(
        "Discard changes?",
        "You have unsaved changes. Discard them?",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, dirty]);

  const markDirty = useCallback(
    <T,>(setter: (v: T) => void) =>
      (value: T) => {
        setter(value);
        setDirty(true);
      },
    []
  );

  const handleSave = async () => {
    const parsedTime = Number(estimatedTime);
    const parsedThreshold = Number(threshold);

    if (!name.trim()) {
      Alert.alert("Error", "Business name is required.");
      return;
    }
    if (isNaN(parsedTime) || parsedTime <= 0) {
      Alert.alert("Error", "Estimated time must be a positive number.");
      return;
    }
    if (isNaN(parsedThreshold) || parsedThreshold < 1 || !Number.isInteger(parsedThreshold)) {
      Alert.alert("Error", "Approaching threshold must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      await updateBusinessSettings(businessId!, {
        name: name.trim(),
        primaryColor: primaryColor.trim(),
        whatsappNumber: whatsappNumber.trim(),
        whatsappApiKey: whatsappApiKey.trim(),
        defaultEstimatedTimePerCustomer: parsedTime,
        approachingThreshold: parsedThreshold,
        formFields,
      });
      setDirty(false);
      Alert.alert("Saved", "Settings updated successfully.");
    } catch {
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldEdit = (fieldId: string) => {
    const field = formFields.find((f) => f.id === fieldId);
    if (field) {
      setEditingField(field);
      setShowFieldEditor(true);
    }
  };

  const handleFieldDelete = (fieldId: string) => {
    Alert.alert("Delete Field", "Remove this form field?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setFormFields((prev) => prev.filter((f) => f.id !== fieldId));
          setDirty(true);
        },
      },
    ]);
  };

  const handleFieldMoveUp = (fieldId: string) => {
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    setDirty(true);
  };

  const handleFieldMoveDown = (fieldId: string) => {
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === fieldId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setDirty(true);
  };

  const handleFieldSave = (field: FormField) => {
    setFormFields((prev) => {
      const idx = prev.findIndex((f) => f.id === field.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = field;
        return next;
      }
      return [...prev, field];
    });
    setDirty(true);
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDragEnd = ({ data }: { data: FormField[] }) => {
    setFormFields(data);
    setDirty(true);
  };

  if (loading || !business) {
    return (
      <View style={[common.screen, styles.center]}>
        <Text style={common.subtitle}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={common.screen}>
      <ScrollView style={common.container}>
        {/* Business Profile */}
        <Text style={styles.sectionTitle}>Business Profile</Text>

        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={common.input}
          value={name}
          onChangeText={markDirty(setName)}
          placeholder="Business name"
          placeholderTextColor={colors.secondary}
        />

        <Text style={styles.label}>Primary Color</Text>
        <TextInput
          style={common.input}
          value={primaryColor}
          onChangeText={markDirty(setPrimaryColor)}
          placeholder="#B8926A"
          placeholderTextColor={colors.secondary}
          autoCapitalize="none"
        />

        <Text style={styles.label}>WhatsApp Number</Text>
        <TextInput
          style={common.input}
          value={whatsappNumber}
          onChangeText={markDirty(setWhatsappNumber)}
          placeholder="+60123456789"
          placeholderTextColor={colors.secondary}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>WhatsApp API Key</Text>
        <TextInput
          style={common.input}
          value={whatsappApiKey}
          onChangeText={markDirty(setWhatsappApiKey)}
          placeholder="API key"
          placeholderTextColor={colors.secondary}
          secureTextEntry
        />

        {/* Queue Defaults */}
        <Text style={styles.sectionTitle}>Queue Defaults</Text>

        <Text style={styles.label}>Estimated Time per Customer (min)</Text>
        <TextInput
          style={common.input}
          value={estimatedTime}
          onChangeText={markDirty(setEstimatedTime)}
          placeholder="10"
          placeholderTextColor={colors.secondary}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Approaching Threshold</Text>
        <TextInput
          style={common.input}
          value={threshold}
          onChangeText={markDirty(setThreshold)}
          placeholder="3"
          placeholderTextColor={colors.secondary}
          keyboardType="numeric"
        />

        {/* Form Fields */}
        <Text style={styles.sectionTitle}>Customer Form Fields</Text>

        {formFields.length > 0 ? (
          <View style={styles.fieldsList}>
            <DraggableFlatList
              data={formFields}
              keyExtractor={(item) => item.id}
              onDragEnd={handleDragEnd}
              scrollEnabled={false}
              renderItem={({ item, drag, getIndex }: RenderItemParams<FormField>) => (
                <Pressable onLongPress={drag}>
                  <FormFieldItem
                    field={item}
                    index={getIndex() ?? 0}
                    totalCount={formFields.length}
                    onEdit={handleFieldEdit}
                    onDelete={handleFieldDelete}
                    onMoveUp={handleFieldMoveUp}
                    onMoveDown={handleFieldMoveDown}
                  />
                </Pressable>
              )}
            />
          </View>
        ) : (
          <Text style={styles.emptyFields}>
            No custom fields. Customers will only enter name and phone.
          </Text>
        )}

        <Pressable
          style={styles.addFieldButton}
          onPress={() => {
            setEditingField(null);
            setShowFieldEditor(true);
          }}
        >
          <Text style={styles.addFieldText}>+ Add Field</Text>
        </Pressable>

        {/* Save Button */}
        <Pressable
          style={[
            common.button,
            styles.saveButton,
            (saving || !dirty) && common.buttonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || !dirty}
        >
          <Text style={common.buttonText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>
      </ScrollView>

      <FormFieldEditorModal
        visible={showFieldEditor}
        field={editingField}
        onSave={handleFieldSave}
        onCancel={() => {
          setShowFieldEditor(false);
          setEditingField(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
    marginTop: 20,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textDark,
    marginBottom: 4,
  },
  fieldsList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyFields: {
    fontSize: 14,
    color: colors.secondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  addFieldButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  addFieldText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 40,
  },
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:mobile
```

Expected: 22 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/SettingsScreen.tsx
git commit -m "feat(mobile): implement SettingsScreen with business profile, queue defaults, and form field editor

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all mobile tests**

```bash
npm run test:mobile
```

Expected: 22 tests PASS (10 original + 5 StaffCard + 7 FormFieldItem).

- [ ] **Step 2: Run all project tests**

```bash
npm run test:shared && npm run test:functions && npm run test:web && npm run test:mobile
```

Expected:
- shared: 21 pass
- functions: 18 pass
- web: 11 pass
- mobile: 22 pass
- **Total: 72 tests pass**

- [ ] **Step 3: Verify git log**

```bash
git log --oneline -10
```

Expected: 9 new commits from this plan (Tasks 1-9).
