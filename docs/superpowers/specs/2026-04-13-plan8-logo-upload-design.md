# Plan 8 Design: Business Logo Upload

## Goal

Allow business owners to upload a circular logo/avatar in Settings. The logo is stored in Firebase Storage, its URL saved to Firestore, and displayed in the SettingsScreen, QueueScreen header, and customer web app join page. Falls back to business name initials when no logo is set.

## Scope

### In scope
- Logo upload in SettingsScreen (tap avatar → image picker → immediate upload)
- `BusinessAvatar` component: circular image or initials fallback
- Display in QueueScreen header (32px, display-only)
- Display in customer web app JoinQueuePage (initials fallback via inline component)
- Firebase Storage initialization in mobile config
- `uploadBusinessLogo` service function

### Out of scope
- Logo display in the navigation tab bar
- Cropping beyond what expo-image-picker's built-in editor provides
- Logo deletion (uploading a new one replaces the old one)
- Web app upload (read-only display only)

## Architecture

### Storage

**Path:** `logos/{businessId}` — fixed path per business. Uploading a new logo overwrites the old file automatically. No orphaned files, no cleanup needed.

**Data model:** `Business.logo: string` and `BusinessPublic.logo: string` already exist in `packages/shared/src/types.ts` — no schema changes needed.

**Firebase Storage init:** Add `getStorage` to `apps/mobile/src/config/firebase.ts` and export `storage`.

### Upload Flow

1. User taps `BusinessAvatar` in SettingsScreen
2. `expo-image-picker` opens image library with `{ allowsEditing: true, aspect: [1,1], quality: 0.7, mediaTypes: 'Images' }`
3. Square crop enforced in the picker UI — no separate cropping screen
4. On selection: set `uploading: true`, upload bytes to `logos/{businessId}` in Firebase Storage
5. Get download URL → call `updateBusinessSettings({ logo: url })` to persist to Firestore
6. Update local `logoUri` state → avatar shows new image immediately
7. On error: Alert + revert `logoUri` to previous value

The logo upload is **outside the normal Settings save flow** — it triggers immediately on image selection. The rest of the settings (name, color, etc.) still use the existing Save button.

### Local State (SettingsScreen additions)

```ts
const [logoUri, setLogoUri] = useState("");
const [uploading, setUploading] = useState(false);
```

`logoUri` is initialized from `business.logo` in the existing `useEffect` that seeds settings state.

## Components

### BusinessAvatar

**File:** `apps/mobile/src/components/BusinessAvatar.tsx`

**Props:**
```ts
interface BusinessAvatarProps {
  uri?: string;        // download URL from Firestore
  name: string;        // business name — used for initials and fallback color
  size: number;        // diameter in px
  onPress?: () => void; // if provided, wraps in Pressable with camera icon overlay
  uploading?: boolean; // shows ActivityIndicator overlay when true
}
```

**Rendering:**
- If `uri` is set: circular `<Image>` (`borderRadius = size / 2`)
- Fallback: colored circle with 1–2 initials in white text
  - Single word: first letter (e.g. "Cafe" → "C")
  - Multi-word: first letter of first two words (e.g. "My Cafe" → "MC")
  - Background color: deterministically derived from name via a simple hash over a fixed 6-color warm palette — always the same color for the same name
- If `onPress` provided: wraps in `<Pressable>`, shows a small camera icon overlay in the bottom-right corner (using `@expo/vector-icons` `Ionicons`)
- Uploading state: `ActivityIndicator` overlaid on the avatar (passed via `uploading?: boolean` prop)

### Web fallback: BusinessInitials (inline)

In the customer web app (`apps/web`), the logo is displayed as a plain `<img>` when `businessData.logo` is set, with an inline `BusinessInitials` div fallback (same initials + color logic in plain CSS/TS). No new component file — implemented inline in `JoinQueuePage.tsx`.

## Service

**File:** `apps/mobile/src/services/logoActions.ts`

```ts
export async function uploadBusinessLogo(
  businessId: string,
  localUri: string
): Promise<string>
```

Steps:
1. Fetch the local URI as a blob
2. Upload blob to `logos/{businessId}` in Firebase Storage (`uploadBytes`)
3. Get download URL (`getDownloadURL`)
4. Call `updateBusinessSettings(businessId, { logo: url })`
5. Return the download URL

## Display Locations

| Location | Component | Size | Tappable |
|----------|-----------|------|----------|
| SettingsScreen — Business Profile section | `BusinessAvatar` | 72px | Yes (triggers upload) |
| QueueScreen — top of screen header area | `BusinessAvatar` | 32px | No |
| Web JoinQueuePage — above business name | `<img>` + inline fallback | 56px | No |

## New Files

```
apps/mobile/src/components/BusinessAvatar.tsx
apps/mobile/src/components/BusinessAvatar.test.tsx
apps/mobile/src/services/logoActions.ts
```

## Modified Files

```
apps/mobile/src/config/firebase.ts       — add getStorage, export storage
apps/mobile/src/screens/SettingsScreen.tsx — add logo upload UI + state
apps/mobile/src/screens/QueueScreen.tsx   — add BusinessAvatar in header
apps/web/src/pages/JoinQueuePage.tsx      — add logo/initials display
```

## Dependencies

**New:**
- `expo-image-picker` — install in `apps/mobile`

`firebase/storage` is already part of the `firebase` package — no new install needed.

```bash
npm install expo-image-picker --workspace=apps/mobile
```

## Testing

**TDD tested:**
- `BusinessAvatar` — 4 tests:
  - Renders image when `uri` provided
  - Renders initials when no `uri`
  - Single-word name → one initial
  - Multi-word name → two initials

**Not tested:**
- `uploadBusinessLogo` (Firebase Storage wrapper)
- SettingsScreen upload flow
- QueueScreen header display
- Web JoinQueuePage display

**Expected test counts after implementation:**
- mobile: 37 (33 existing + 4 new)
- all others unchanged
- Total: 92
