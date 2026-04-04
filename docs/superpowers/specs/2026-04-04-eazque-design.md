# eazque — Queue Management System Design Spec

## Overview

eazque is a general-purpose queue management system with two interfaces:
- **Business owner native app** (Expo/React Native) — full dashboard for managing queues, staff, analytics, and settings
- **Customer web page** (Vite + React) — lightweight mobile-first page for joining a queue via QR scan and viewing live status

Customers scan a QR code, fill a short configurable form, join the queue, and connect with the business on WhatsApp. They see real-time queue status updates. The business owner manages everything from the native app.

## Architecture

### Monorepo Structure

```
eazque/
├── apps/
│   ├── mobile/              # Expo app (business owner dashboard)
│   └── web/                 # Vite + React app (customer-facing)
├── packages/
│   └── shared/              # Shared types, Firebase config, Zod schemas, constants
├── firebase/
│   ├── firestore.rules
│   ├── functions/           # Cloud Functions (WhatsApp API, queue logic)
│   └── firebase.json
├── package.json             # Workspace root (npm workspaces)
└── tsconfig.base.json
```

- **npm workspaces** for monorepo management
- **`packages/shared`** exports: Firestore types/interfaces, Zod validation schemas, constants (field types, queue statuses), Firebase config
- **`firebase/functions`** handles server-side logic: WhatsApp Business API calls, queue number generation, scheduled daily resets, wait time calculations

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Business app | Expo (React Native), React Navigation (bottom tabs + stacks) |
| Customer web | Vite + React, mobile-first responsive |
| Backend | Firebase (Firestore, Cloud Functions, Auth) |
| Validation | Zod (shared schemas) |
| Real-time | Firestore real-time listeners |
| WhatsApp | Deep link (Layer 1) + Business API via Cloud Functions (Layer 2) |

## Design Theme — Warm Sand

Default eazque palette (business owners can override primary color with their branding):

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#B8926A` | Buttons, highlights, queue numbers |
| Secondary | `#D4B896` | Secondary text, borders |
| Light accent | `#E8D5BE` | Tags, badges |
| Surface | `#F5EDE3` | Cards, input backgrounds |
| Background | `#FBF8F4` | Page background |
| Text dark | `#5A4430` | Primary text |
| WhatsApp green | `#25D366` | WhatsApp button (brand color, never altered) |

## Firestore Data Model

```
businesses/
  {businessId}/
    ├── name: string
    ├── logo: string (URL)
    ├── primaryColor: string (hex)
    ├── whatsappNumber: string
    ├── whatsappApiKey: string (encrypted, server-side only)
    ├── defaultEstimatedTimePerCustomer: number (minutes)
    ├── approachingThreshold: number (default: 3)
    ├── formFields: array
    │     { id: string, type: FieldType, label: string, required: boolean, options?: string[] }
    │     FieldType: "text" | "number" | "phone" | "dropdown" | "checkbox"
    ├── createdAt: timestamp
    ├── updatedAt: timestamp
    │
    ├── staff/ (subcollection)
    │     {staffId}/
    │       ├── email: string
    │       ├── name: string
    │       ├── role: "owner" | "staff"
    │       ├── createdAt: timestamp
    │
    ├── queues/ (subcollection)
    │     {queueId}/
    │       ├── name: string
    │       ├── status: "active" | "paused"
    │       ├── currentNumber: number (currently being served)
    │       ├── nextNumber: number (next to be assigned)
    │       ├── date: string (YYYY-MM-DD, for daily reset)
    │       ├── avgServiceTime: number (rolling average, minutes)
    │       ├── completedCount: number (capped at 20 for rolling window)
    │       │
    │       ├── entries/ (subcollection)
    │           {entryId}/
    │             ├── queueNumber: number (e.g., 12)
    │             ├── displayNumber: string (e.g., "Q-012")
    │             ├── status: "waiting" | "serving" | "completed" | "skipped" | "removed"
    │             ├── customerName: string
    │             ├── phone: string
    │             ├── formData: map (field responses keyed by field ID)
    │             ├── notes: string (staff-added)
    │             ├── sessionToken: string (for customer web access)
    │             ├── joinedAt: timestamp
    │             ├── servedAt: timestamp | null
    │             ├── completedAt: timestamp | null
```

**Key design decisions:**
- Queue as subcollection — ships with one queue per business, but structure supports multiple queues later without migration
- `sessionToken` on entries — cryptographically random string (`crypto.randomUUID()`) for stateless customer access
- `avgServiceTime` and `completedCount` on queue doc — avoids reading all entries to calculate wait times
- Separate `servedAt` and `completedAt` — needed for actual service duration calculation

## Customer Web App

### Routes

- `/q/{businessId}` — Join queue form
- `/q/{businessId}/status/{sessionToken}` — Live queue status

### Screen Flow

**1. Join Queue Form**
- Displays business branding (name, logo, primary color)
- Renders form fields dynamically from `business.formFields` config
- Name and phone number are always present (hardcoded, not part of formFields)
- Validates with Zod schemas from shared package
- Submits via Firebase callable function (not direct Firestore write)

**2. Confirmation + WhatsApp**
- Shows assigned queue number prominently
- Displays current serving number and estimated wait time
- Green "Connect on WhatsApp" button — deep link: `https://wa.me/{whatsappNumber}?text=Hi!%20I've%20joined%20the%20queue%20at%20{businessName}.%20My%20queue%20number%20is%20{displayNumber}.`
- Automatically transitions to status view (same page, status section expands)

**3. Live Queue Status**
- Real-time via Firestore listener on queue doc + entries subcollection
- Shows: your number, currently serving number, people ahead count, estimated wait time
- List of queue entries ahead (queue number and status only — no personal info)
- Customer's own entry highlighted
- Auto-updates as the queue advances

### Access Methods
- Bookmark/URL: customer can revisit `/q/{businessId}/status/{sessionToken}`
- WhatsApp link: after connecting, business can send the status URL via WhatsApp

### QR Code Generation
- The QR code encodes the URL: `https://{domain}/q/{businessId}`
- Generated in the business owner app (Settings → QR Code) for printing/display
- The app uses a QR code library to render a downloadable/printable QR image
- Customers scan with their phone's native camera — no in-app scanner needed

## Business Owner Mobile App (Expo)

### Navigation Structure

Bottom tabs with stack navigators:

**Tab 1 — Queue (Home)**
- Large "Now Serving" display with current number
- "Next" button — primary action, advances the queue
- Quick stats: waiting count, avg wait time, total served today
- Scrollable list of waiting entries (name, queue number, joined time)
- Swipe actions on entries: Skip, Remove, Add Note

**Tab 2 — History**
- Today's completed/skipped/removed entries
- Date picker to view past days
- Search by name or queue number

**Tab 3 — Analytics**
- Average wait time (today, this week, this month)
- Busiest hours chart (bar chart)
- Total customers served over time
- Average service duration

**Tab 4 — Staff**
- List of staff members with roles (owner / staff)
- Invite staff via email
- Permissions: `owner` has full access; `staff` can manage queue but cannot change settings or manage other staff

**Settings (gear icon in header)**
- Business profile: name, logo, primary color
- WhatsApp configuration: phone number, API key
- Form builder: add/remove/reorder predefined field types
- Queue settings: pause queue, reset queue manually
- Account: change password, logout

### Authentication
- Firebase Auth with email + password
- Owner creates account on first launch, sets up business profile
- Staff receive email invite, create their own account, linked to business

## WhatsApp Integration

### Layer 1 — Deep Link (no API needed)
- Customer taps "Connect on WhatsApp" button on confirmation screen
- Opens WhatsApp with pre-filled message to business number
- Establishes a conversation between customer and business
- Works immediately, no setup required from business owner

### Layer 2 — WhatsApp Business API (automated notifications)
- Optional — requires business owner to configure API key in settings
- Triggered by Cloud Functions on queue state changes
- Notifications:
  1. **"Your turn is approaching"** — customer is within `approachingThreshold` positions (default: 3)
  2. **"It's your turn"** — `currentNumber` matches their `queueNumber`
  3. **"You were skipped"** — staff skipped the customer, with option to rejoin
- Uses pre-approved WhatsApp message templates (required by Meta)
- If API not configured, Layer 1 still works standalone — notifications are a premium/optional feature

## Cloud Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `onCustomerJoin` | HTTPS callable | Assigns next queue number atomically (Firestore transaction), generates `sessionToken`, returns `displayNumber` |
| `onEntryStatusChange` | Firestore onUpdate (`entries/`) | On "completed": calculates service duration, updates rolling average. On "serving": triggers "it's your turn" WhatsApp notification |
| `onCurrentNumberAdvance` | Firestore onUpdate (`queues/`) | Checks if any waiting customer is within approaching threshold, triggers "approaching" notification |
| `dailyQueueReset` | Cloud Scheduler (midnight, business timezone) | Resets `currentNumber` to 0, `nextNumber` to 1, `completedCount` to 0. Old entries preserved for analytics |
| `sendWhatsAppNotification` | Called by other functions | Wrapper around WhatsApp Business API. Checks if business has API configured, selects template, sends message. Fails silently if not configured |

### Queue Number Assignment (race condition prevention)

```
Firestore Transaction:
  1. Read queue doc → get nextNumber
  2. Create entry doc → set queueNumber = nextNumber, generate sessionToken
  3. Update queue doc → nextNumber += 1
```

### Wait Time Calculation (hybrid)

```
If completedCount >= 5:
  estimatedWait = positionInQueue * avgServiceTime       // data-driven
Else:
  estimatedWait = positionInQueue * defaultEstimatedTimePerCustomer  // business-configured
```

### Rolling Average Update

```
On entry status → "completed":
  serviceDuration = completedAt - servedAt
  newAvg = ((avgServiceTime * min(completedCount, 20)) + serviceDuration) / (min(completedCount, 20) + 1)
  completedCount = min(completedCount + 1, 20)   // cap at 20 for rolling window
```

## Security & Firestore Rules

### Customer web app (unauthenticated)
- **Can read:** business doc (name, logo, primaryColor, formFields only — NOT whatsappApiKey), queue doc (currentNumber, status, avgServiceTime), entries (queueNumber, displayNumber, status only — NOT customerName, phone, formData)
- **Can read own full entry:** if request includes matching `sessionToken`
- **Cannot write:** all writes go through callable Cloud Functions
- **Rate limiting:** on `onCustomerJoin` callable to prevent queue spam

### Business owner app (authenticated)
- **Owner role:** full read/write on their business doc, all subcollections
- **Staff role:** read/write on queues and entries, read-only on business doc, no access to staff subcollection management
- Neither role can access other businesses' data

### Cloud Functions (admin SDK)
- Full read/write access
- Only path for creating entries (queue join)
- Only path for accessing `whatsappApiKey`
- `whatsappApiKey` never leaves the server

### Additional security measures
- `sessionToken` is cryptographically random (`crypto.randomUUID()`), not derivable from queue number
- Customer personal data (name, phone, formData) only readable by authenticated business staff
- API keys stored encrypted in Firestore

## Testing Strategy

### Shared package (`packages/shared`) — Vitest
- Unit tests for Zod validation schemas (valid/invalid form data, all field types)
- Unit tests for utility functions (display number formatting, wait time calculation)

### Customer web app (`apps/web`) — Vitest + React Testing Library
- Component tests for dynamic form renderer (renders correct field types from config)
- Component tests for queue status display (updates on data changes)
- Integration test for join queue flow (form → callable → confirmation)

### Business owner app (`apps/mobile`) — Jest + React Native Testing Library
- Component tests for queue management screen (next, skip, remove actions)
- Component tests for form builder (add/remove/reorder fields)
- Component tests for analytics display

### Cloud Functions (`firebase/functions`) — Jest + Firebase Emulator
- Unit tests for queue number assignment transaction logic
- Unit tests for rolling average calculation
- Unit tests for WhatsApp notification template selection
- Integration tests using Firebase Emulator Suite (Firestore + Functions locally)

### E2E (stretch goal, not v1 blocker)
- Customer flow: scan QR → fill form → see status update
- Business flow: login → advance queue → customer notified
- Tools: Detox (mobile) / Playwright (web) — decided later
