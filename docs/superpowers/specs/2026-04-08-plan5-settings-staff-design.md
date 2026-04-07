# Plan 5 Design: Settings + Staff Management (Owner-Only)

## Goal

Build the Settings screen and Staff management tab for business owners in the mobile app. Owners can edit business profile, queue defaults, custom form fields, and manage their staff list. Non-owner staff see neither Settings nor the Staff tab.

## Scope

### In scope
- AuthContext update to track user role
- Settings screen (gear icon in header): business profile, WhatsApp config, queue defaults, form field editor
- Staff tab (owner-only): list, add, remove staff members
- Form field editor with drag-to-reorder + up/down buttons
- Navigation restructure: AppStack wrapping MainTabs + SettingsScreen
- Shared type update: add `status` to Staff interface

### Out of scope (deferred)
- Staff login/signup flow (staff auth matching by email)
- Logo upload (requires Firebase Storage)
- Role editing (changing staff to owner or vice versa)
- Color picker (hex input for MVP)

## Architecture

### Navigation Structure

```
RootNavigator (auth gate)
  ├── AuthStack (unauthenticated)
  │   ├── LoginScreen
  │   └── SignUpScreen
  └── AppStack (authenticated)
       ├── MainTabs (screen)
       │   ├── Queue tab
       │   ├── History tab (placeholder)
       │   ├── Analytics tab (placeholder)
       │   └── Staff tab (owner-only, conditionally rendered)
       └── SettingsScreen (pushed on top of tabs)
```

- Gear icon in the Queue tab header, visible only for `role === "owner"`
- Tapping gear navigates to SettingsScreen via AppStack

### AuthContext Changes

Add `role` to AuthState:

```typescript
interface AuthState {
  user: User | null;
  businessId: string | null;
  role: "owner" | "staff" | null;
  loading: boolean;
}
```

On `onAuthStateChanged`:
- If `businesses/{user.uid}` exists (user is owner), set `role = "owner"` via direct getDoc on `businesses/{uid}/staff/{uid}`
- Non-owner staff login is deferred — for now, if no business doc matches, `role` stays `null`
- When staff login is implemented later, this will need an email-based query to find the staff doc

### Settings Screen

`SettingsScreen.tsx` — ScrollView with sectioned form.

**Business Profile section:**
- Business name (TextInput)
- Primary color (TextInput, hex value)
- WhatsApp number (TextInput, phone keyboard)
- WhatsApp API key (TextInput, secureTextEntry)

**Queue Defaults section:**
- Estimated time per customer (TextInput, numeric, in minutes)
- Approaching threshold (TextInput, numeric)

**Form Fields section:**
- List of current FormFields with edit/delete per item
- Drag-to-reorder via react-native-draggable-flatlist
- Up/down arrow buttons as secondary reorder mechanism
- "Add Field" button at bottom
- Tap field or tap edit icon → opens FormFieldEditor modal

**Save behavior:**
- Single "Save" button at bottom
- Writes all changes to business doc at once (no auto-save)
- Prompt "Discard unsaved changes?" on back navigation if form is dirty

**Data flow:**
- `useBusinessSettings(businessId)` hook — onSnapshot on business doc, returns Business data
- `updateBusinessSettings(businessId, updates)` — updateDoc on business doc with updatedAt timestamp

### Form Field Editor

`FormFieldEditorModal.tsx` — modal for creating/editing a single form field.

Fields:
- Label (TextInput, required)
- Type (picker: text, number, phone, dropdown, checkbox)
- Required (Switch toggle)
- Options list (visible only when type === "dropdown")
  - Add option (TextInput + add button)
  - Remove option (X button per option)

Returns the edited FormField to the parent (SettingsScreen manages the array).

### Staff Tab

`StaffScreen.tsx` — replaces PlaceholderScreen for Staff tab. Owner-only.

**Staff list:**
- FlatList of StaffCards
- Each card: name, email, role badge ("Owner" / "Staff"), status badge ("Pending" if applicable)
- Owner's own card has no delete action
- Other cards have swipe-to-remove (Swipeable, same pattern as EntryCard)

**Add staff:**
- "Add Staff" button in header right
- Modal with email + name inputs
- Creates staff doc: `{ email, name, role: "staff", status: "pending", createdAt }`
- Auto-generated Firestore doc ID (no UID yet — person hasn't signed up)
- Basic email format validation

**Remove staff:**
- Swipe action triggers Alert.alert confirmation
- Deletes the staff doc

**Data flow:**
- `useStaff(businessId)` hook — onSnapshot on staff collection, returns Staff[]
- `staffActions.ts`:
  - `addStaffMember(businessId, email, name)` — addDoc to staff collection
  - `removeStaffMember(businessId, staffId)` — deleteDoc

### Shared Type Update

Add `status` to Staff interface in `packages/shared/src/types.ts`:

```typescript
interface Staff {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  status: "active" | "pending";
  createdAt: Date;
}
```

Add staff statuses to constants:

```typescript
export const STAFF_STATUSES = ["active", "pending"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];
```

### Components

**TDD tested:**
- `StaffCard.tsx` — pure display: name, email, role badge, status badge, swipe-to-remove
- `FormFieldItem.tsx` — pure display: field label, type, required indicator, edit/delete/reorder controls

**Not tested (Firebase wrappers / screens):**
- `useBusinessSettings` hook
- `useStaff` hook
- `staffActions.ts` service
- `updateBusinessSettings` service
- `SettingsScreen.tsx`
- `StaffScreen.tsx`
- `FormFieldEditorModal.tsx`

### New File Structure

```
apps/mobile/src/
├── components/
│   ├── StaffCard.tsx              # Staff member display with swipe
│   ├── StaffCard.test.tsx         # TDD tests
│   ├── StaffList.tsx              # FlatList wrapper
│   ├── FormFieldItem.tsx          # Form field display with controls
│   ├── FormFieldItem.test.tsx     # TDD tests
│   └── FormFieldEditorModal.tsx   # Edit/create form field modal
├── hooks/
│   ├── useBusinessSettings.ts     # Real-time business doc listener
│   └── useStaff.ts                # Real-time staff collection listener
├── navigation/
│   └── AppStack.tsx               # New: wraps MainTabs + SettingsScreen
├── screens/
│   ├── SettingsScreen.tsx         # Business settings editor
│   └── StaffScreen.tsx            # Staff management (replaces placeholder)
└── services/
    ├── settingsActions.ts         # updateBusinessSettings
    └── staffActions.ts            # addStaffMember, removeStaffMember
```

### Modified Files

```
apps/mobile/src/contexts/AuthContext.tsx  # Add role to state
apps/mobile/src/navigation/MainTabs.tsx   # Conditional Staff tab, gear icon
apps/mobile/src/navigation/RootNavigator.tsx  # Render AppStack instead of MainTabs
packages/shared/src/types.ts              # Add status to Staff
packages/shared/src/constants.ts          # Add STAFF_STATUSES
```

### Dependencies

- `react-native-draggable-flatlist` — drag-to-reorder in form field editor (peer dep: react-native-reanimated, already installed)

### Firestore Rules

No changes needed. Current rules already support:
- Owner update on business doc (`isBusinessOwner`)
- Owner create/update/delete on staff subcollection (`isBusinessOwner`)
- Staff read on staff subcollection (`isBusinessStaff`)

### Firestore Security Note

Staff doc creation by owner uses `addDoc` (auto-ID) since the staff member's UID is unknown at invite time. This is different from the bootstrap flow which uses `setDoc` with UID as doc ID. When the staff login flow is built later, the pending doc will need to be migrated (delete pending doc, create new doc with UID as ID) or the security model adjusted to support email-based lookups.
