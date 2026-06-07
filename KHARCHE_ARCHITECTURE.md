# Kharche — Full Architecture Reference

> **Name:** Kharche — Multi-currency expense tracker  
> **Stack:** Next.js 16.2.1 (App Router) + TypeScript + MongoDB (Mongoose + raw driver) + Tailwind CSS v4  
> **Auth:** Better Auth v1.5.6 (email/password + Google OAuth)  
> **State:** React Context + SWR for data fetching  
> **Styling:** Custom CSS variables, Tailwind v4, Playfair Display + Inter fonts  
> **PWA:** Full PWA with service worker, manifest, install prompt  
> **Encryption:** Client-side AES-256-GCM + RSA-OAEP end-to-end encryption layer

---

## Table of Contents

1. [Quick Reference](#1-quick-reference)
2. [Directory Structure](#2-directory-structure)
3. [Architecture & Data Flow](#3-architecture--data-flow)
4. [Models (Mongoose)](#4-models-mongoose)
5. [API Routes](#5-api-routes)
6. [Authentication & Middleware](#6-authentication--middleware)
7. [Context Providers](#7-context-providers)
8. [UI Components](#8-ui-components)
9. [Crypto Layer (E2E Encryption)](#9-crypto-layer-e2e-encryption)
10. [Utility Functions](#10-utility-functions)
11. [Key Patterns & Conventions](#11-key-patterns--conventions)
12. [State of Completion](#12-state-of-completion)

---

## 1. Quick Reference

### Run Commands
```bash
npm run dev       # Next.js dev server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

### Environment Variables (`.env.local`)
```
MONGODB_URI=mongodb+srv://...
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=Kharche <...>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Import Alias
```ts
import Something from "@/path"  // maps to ./expense_tracker/path
```

### CSS Variables
```css
--background: #ffffff / #000000 (dark)
--foreground: #111827 / #f3f4f6
--border: #f3f4f6 / #1f2937
--muted: #9ca3af / #6b7280
--accent: #111827 / #ffffff
--surface: #ffffff / #0a0a0a
```

---

## 2. Directory Structure

```
expense_tracker/
├── app/                          # Next.js App Router
│   ├── api/                      # Backend API endpoints
│   │   ├── auth/                 # Better Auth handler + custom routes
│   │   │   └── [...better-auth]/route.ts
│   │   ├── categories/route.ts   # Custom category CRUD
│   │   ├── expense-books/        # Expense book CRUD
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── expenses/             # Expense CRUD
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── rooms/                # Room/group expense system
│   │   │   ├── route.ts
│   │   │   ├── [roomId]/route.ts
│   │   │   ├── [roomId]/tickets/route.ts
│   │   │   ├── [roomId]/tickets/[ticketId]/route.ts
│   │   │   ├── [roomId]/stats/route.ts
│   │   │   ├── [roomId]/settle/route.ts
│   │   │   ├── [roomId]/leave/route.ts
│   │   │   ├── invite/[roomId]/route.ts
│   │   │   └── join/[roomId]/route.ts
│   │   └── user/                 # User profile, wallet, encryption
│   │       ├── wallet/route.ts
│   │       ├── profile/route.ts
│   │       ├── profile-picture/route.ts
│   │       └── encryption/
│   │           ├── status/route.ts
│   │           ├── setup/route.ts
│   │           └── keys/route.ts
│   ├── components/               # Shared UI components
│   │   ├── rooms/                # Room-specific components
│   │   │   ├── RoomList.tsx
│   │   │   ├── RoomCard.tsx
│   │   │   ├── RoomView.tsx
│   │   │   ├── RoomTickets.tsx
│   │   │   ├── RoomBalances.tsx
│   │   │   ├── RoomMembers.tsx
│   │   │   ├── AddTicketModal.tsx
│   │   │   ├── CreateRoomModal.tsx
│   │   │   ├── SettleModal.tsx
│   │   │   └── InviteLinkModal.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ActionFab.tsx
│   │   ├── AddExpenseForm.tsx
│   │   ├── AddExpenseBookForm.tsx
│   │   ├── ExpenseList.tsx
│   │   ├── ExpenseTableRow.tsx
│   │   ├── ExpenseDrawer.tsx (ActionMenuDrawer)
│   │   ├── ExpenseBookList.tsx
│   │   ├── ExpenseBookCard.tsx
│   │   ├── InsightsView.tsx
│   │   ├── MinimalBarChart.tsx
│   │   ├── SmartCategoryInput.tsx
│   │   ├── WalletBalanceDisplay.tsx
│   │   ├── AccountSheet.tsx
│   │   ├── BottomNav.tsx
│   │   ├── BottomSheet.tsx
│   │   ├── Modal.tsx
│   │   ├── FullScreenLoader.tsx
│   │   ├── SignOutButton.tsx
│   │   ├── DownloadLink.tsx
│   │   ├── ErrorMessage.tsx
│   │   ├── Skeletons.tsx
│   │   ├── PwaRegistry.tsx
│   │   └── SWRProvider.tsx
│   ├── hooks/                    # Client hooks (custom per-page)
│   │   └── useDraggableSheet.ts
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   ├── download/page.tsx         # PWA install page
│   ├── me/page.tsx               # Redirects to /me/account
│   ├── me/account/page.tsx
│   ├── me/wallet/page.tsx
│   ├── rooms/join/[roomId]/page.tsx
│   ├── layout.tsx                # Root layout (all providers)
│   ├── page.tsx                  # Dashboard (main app)
│   ├── loading.tsx               # Global loading state
│   └── globals.css               # Tailwind imports + CSS variables
├── context/                      # React Context providers
│   ├── ExpenseContext.tsx
│   ├── NotificationContext.tsx
│   ├── ProcessingContext.tsx
│   └── WalletContext.tsx
├── crypto/                       # Client-side E2E encryption
│   ├── index.ts                  # Public API export
│   ├── types.ts                  # Interfaces & constants
│   ├── errors.ts                 # Error classes
│   ├── services/
│   │   ├── aes.service.ts
│   │   ├── asymmetric.service.ts
│   │   ├── keyAccess.ts
│   │   ├── keyDerivation.service.ts
│   │   ├── orchestrator.ts
│   │   ├── payloadEncryption.service.ts
│   │   └── recoveryKey.service.ts
│   ├── indexeddb/
│   │   ├── cacheManager.ts
│   │   ├── db.ts
│   │   ├── masterKeyStore.ts
│   │   ├── privateKeyStore.ts
│   │   ├── roomKeyStore.ts
│   │   └── stores.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── encoding.ts
│   │   └── keySerializer.ts
│   └── __tests__/                # (empty)
├── hooks/                        # Shared React hooks
│   ├── useAuth.ts
│   ├── useEncryption.ts
│   └── usePWAInstall.ts
├── lib/                          # Server-side libraries
│   ├── auth.ts                   # Better Auth config
│   ├── auth-client.ts            # Client auth wrapper
│   ├── cachedSession.ts          # Session caching (TTL 30s)
│   ├── db.ts                     # Mongoose connection (singleton)
│   ├── email.ts                  # Nodemailer Gmail transporter
│   └── rooms/
│       ├── balanceEngine.ts      # Balance update engine
│       └── splitCalculator.ts    # Split calculation logic
├── models/                       # Mongoose models
│   ├── User.ts
│   ├── Expense.ts
│   ├── ExpenseBook.ts
│   ├── Room.ts
│   ├── RoomBook.ts
│   ├── RoomStats.ts
│   ├── RoomTicket.ts
│   ├── UserEncryption.ts
│   └── CustomCategory.ts
├── utils/                        # Utility functions
│   ├── aggregateExpenses.ts
│   ├── currencyConverter.ts
│   ├── dateHelpers.ts
│   ├── formatCurrency.ts
│   ├── normalizeCategory.ts
│   └── roomCurrency.ts
├── public/                       # Static assets + PWA
│   ├── sw.js                     # Service worker
│   ├── logo.png
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
├── proxy.ts                      # Middleware (rate limit + auth guard)
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Architecture & Data Flow

### Provider Hierarchy (Root Layout)
```
html > body
  ├── PwaRegistry
  ├── SWRProvider
  │   └── NotificationProvider
  │       └── ProcessingProvider
  │           └── WalletProvider
  │               └── ExpenseProvider
  │                   └── {children}
```

### Data Fetching Pattern (SWR)
All data fetching uses SWR with global config:
```ts
// SWRProvider.tsx global config
{ dedupingInterval: 30000, focusThrottleInterval: 60000, errorRetryCount: 2 }
```

**Pattern:** Mutations use the `mutate` function with optimistic updates and cache population:
```ts
const { mutate } = useSWRConfig();
await mutate(
  key,
  async () => { /* API call */ return result; },
  { optimisticData: ..., rollbackOnError: true, revalidate: true, populateCache: true }
);
```

### Session Fetching
- **Server:** `getCachedSession(headers)` from `lib/cachedSession.ts` — caches 30s with LRU eviction at 200 entries
- **Client:** `useSession()` from `lib/auth-client.ts` (wraps `better-auth/react` `useSession()`)
- **Middleware:** `proxy.ts` — rate limit (150/min/IP) + auth guard (redirects to `/sign-in`)

---

## 4. Models (Mongoose)

### User (`models/User.ts`, collection: `user`)
```ts
interface IUser {
  name: string;
  email: string;                    // unique
  emailVerified: boolean;
  image?: string;
  walletBalance: number;            // default 0
  currency: string;                 // default "INR"
  rooms: ObjectId[];                // ref "Room"
  encryptionEnabled: boolean;       // default false
  encryptionVersion: number;        // default 0
  timestamps: true;
}
```

### Expense (`models/Expense.ts`, collection: `expenses`)
```ts
interface IExpense {
  userId: ObjectId;                 // ref "User", required
  bookId?: ObjectId;                // ref "ExpenseBook"
  amount: number;                   // required
  currency: string;                 // default "USD"
  category: string;                 // required
  description?: string;
  date: Date;                       // default Date.now
  encryptedPayload?: string;
  encryptionVersion: number;        // default 0
  timestamps: true;
}
// Indexes: (userId, date -1), (userId, category, date -1), (userId, bookId, date -1)
```

### ExpenseBook (`models/ExpenseBook.ts`, collection: `expensebooks`)
```ts
interface IExpenseBook {
  userId: ObjectId;                 // ref "User", required
  title?: string;
  description?: string;
  currency: string;                 // required
  encryptedPayload?: string;
  encryptionVersion: number;
  expenses: ObjectId[];             // ref "Expense"
  timestamps: true;
}
```

### Room (`models/Room.ts`, collection: `rooms`)
```ts
interface IRoom {
  name: string;                     // required
  users: ObjectId[];                // ref "User"
  bookId: ObjectId;                 // ref "RoomBook"
  currency: string;                 // default "INR"
  timestamps: true;
}
```

### RoomBook (`models/RoomBook.ts`, collection: `roombooks`)
```ts
interface IRoomBook {
  roomId: ObjectId;                 // ref "Room"
  tickets: ObjectId[];              // ref "RoomTicket"
  timestamps: true;
}
```

### RoomTicket (`models/RoomTicket.ts`, collection: `roomtickets`)
```ts
type SplitType = "equal" | "manual" | "percentage" | "ratio" | "settlement";
type TicketType = "expense" | "settlement";

interface IDistributionEntry {
  userId: ObjectId;
  amount: number;   // integer, smallest currency unit
}

interface IRoomTicket {
  roomId: ObjectId;                 // indexed
  bookId: ObjectId;                 // indexed
  creatorId: ObjectId;              // payer
  bearerId?: ObjectId;              // receiver (settlements only)
  type: TicketType;
  title: string;
  description?: string;
  totalAmount: number;              // integer, smallest unit
  splitType: SplitType;
  distribution: IDistributionEntry[];
  involvedUsers: ObjectId[];
  timestamps: true;
}
```

### RoomStats (`models/RoomStats.ts`, collection: `roomstats`)
```ts
interface IBalanceEntry {
  userId: ObjectId;
  amount: number;  // +ve = current user owes this user; -ve = this user owes current user
}

interface IRoomStats {
  roomId: ObjectId;
  userId: ObjectId;
  balances: IBalanceEntry[];
  timestamps: true;
}
// Unique compound index: (roomId, userId)
```

### UserEncryption (`models/UserEncryption.ts`, collection: `userencryptions`)
```ts
interface IUserEncryption {
  userId: ObjectId;                 // unique
  publicKey: string;                // JWK as JSON string
  encryptedPrivateKey: string;      // AES-GCM encrypted private key JWK
  encryptedMasterKey: string;       // AES-GCM encrypted master key
  salt: string;                     // PBKDF2 salt (base64url)
  recoveryKeyEnvelope: string;      // Master key encrypted with recovery key
  encryptionVersion: number;        // default 1
  setupCompleted: boolean;          // default false
  timestamps: true;
}
```

### CustomCategory (`models/CustomCategory.ts`, collection: `customcategories`)
```ts
interface ICustomCategory {
  userId: ObjectId;
  displayName: string;
  normalizedName: string;
  usageCount: number;               // default 1
  lastUsedAt: Date;
  createdAt: Date;                  // timestamps: createdAt only
}
// Indexes: (userId, normalizedName) unique, (userId, usageCount -1), (userId, lastUsedAt -1)
```

---

## 5. API Routes

### Auth (`/api/auth/[...better-auth]/`)
- Delegates to Better Auth's Next.js handler
- Custom routes:
  - `POST /api/auth/check-email` — checks if email exists
  - `POST /api/auth/set-wallet-default-currency` — changes wallet currency

### Expenses (`/api/expenses`)
| Method | Description | Auth |
|--------|-------------|------|
| `GET` | List expenses (paginated, max 50). Query: `sortBy`, `sort`, `category`, `bookId`, `page`, `limit`, `dateFilterType`, `dateFilterValue`, `timezoneOffset` | Yes |
| `POST` | Create expense. Validates wallet balance (threshold). Supports `encryptedPayload`. | Yes |

**`POST` validation:**
- `amount <= 1,000,000`
- `category` required, max 20 chars
- `description` max 100 chars
- Wallet balance must stay above threshold (1000 INR equivalent)

### Expense Books (`/api/expense-books`)
| Method | Description |
|--------|-------------|
| `GET` | List user's books (paginated, max 50) |
| `POST` | Create book (supports encrypted payload) |
| `GET /[id]` | Get single book |
| `PUT /[id]` | Update book |
| `DELETE /[id]` | Delete book |

### Rooms (`/api/rooms`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | List user's rooms (enriched with `netBalance`) |
| `POST` | `/` | Create room (init balances, link User→Room) |
| `GET` | `/[roomId]` | Get room details (membership check) |
| `GET` | `/[roomId]/tickets` | List tickets (paginated, populated) |
| `POST` | `/[roomId]/tickets` | Create expense ticket (split calc, balance update) |
| `PUT` | `/[roomId]/tickets/[ticketId]` | Edit expense ticket (reverse old, apply new) |
| `DELETE` | `/[roomId]/tickets/[ticketId]` | Delete + reverse all balance effects |
| `GET` | `/[roomId]/stats` | Current user's balances (privacy-safe) |
| `POST` | `/[roomId]/settle` | Record settlement (creates settlement ticket) |
| `DELETE` | `/[roomId]/leave` | Leave room (blocked if outstanding balances) |
| `POST` | `/join/[roomId]` | Join room via invite link |
| `GET` | `/invite/[roomId]` | Public invite info (no auth) |

### User (`/api/user`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/wallet` | Get wallet balance |
| `POST` | `/wallet` | Add money (only addition allowed) |
| `PUT` | `/profile` | Update name |
| `POST` | `/profile-picture` | Upload profile picture (base64, max 1MB) |
| `POST` | `/encryption/setup` | Save encryption keys |
| `GET` | `/encryption/status` | Check if encryption is configured |
| `GET` | `/encryption/keys` | Retrieve encryption keys (for unlock) |

### Categories (`/api/categories`)
| Method | Description |
|--------|-------------|
| `GET` | Search by prefix (`?q=...`) or get all (`?all=true`). Returns top 10 by default. Excludes predefined: Food, Transport, Rent, Entertainment, Utilities. |

---

## 6. Authentication & Middleware

### Better Auth (`lib/auth.ts`)
- MongoDB adapter with transaction support
- Email/password with email verification
- Google OAuth
- Password reset via email (Nodemailer + Gmail)
- Custom `currency` field on user model
- Base URL from `NEXT_PUBLIC_APP_URL`

### Session Caching (`lib/cachedSession.ts`)
```ts
getCachedSession(headers: Headers): Promise<Session | null>
evictSession(headers: Headers): void
```
- 30s TTL with LRU eviction at 200 entries
- Cache key = session cookie token

### Auth Client (`lib/auth-client.ts`)
```ts
export const { signIn, signUp, useSession, signOut, requestPasswordReset, resetPassword, verifyEmail, getSession } = authClient;
```

### Middleware (`proxy.ts`)
- Rate limiter: 150 req/min per IP (in-memory Map)
- Auth guard: redirects unauthenticated users to `/sign-in`
- Public paths exempt: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/api/auth`, `/logo.png`, `/icon.png`, `/manifest.webmanifest`
- Matcher: `/((?!_next/static|_next/image|favicon.ico).*)`

### Hooks
- `useAuth()`: Returns `{ session, user, loading, error, authenticated }`
- `useSession()`: From `auth-client.ts` (Better Auth's `useSession`)

---

## 7. Context Providers

### NotificationProvider (`context/NotificationContext.tsx`)
```ts
const { notifications, showNotification, removeNotification } = useNotification();
showNotification(message: string, type?: "success" | "error" | "info" | "warning")
```
- Fixed top-center toast container (z-9999)
- Auto-dismiss after 5s
- Color coded: success=emerald, error=rose, warning=amber, info=blue

### ProcessingProvider (`context/ProcessingContext.tsx`)
```ts
const { processingIds, setProcessing, isProcessing, withProcessing } = useProcessing();
await withProcessing(id, async () => { /* operation */ });
```
- Per-item processing states for optimistic UI feedback
- `withProcessing` wraps async fn, sets loading state on entry, clears on exit

### WalletProvider (`context/WalletContext.tsx`)
```ts
const { walletBalance, walletCurrency, loading, error, refetchWallet, setWalletDefaultCurrency } = useWallet();
```
- Fetches wallet on session load
- `refetchWallet(user?, silent?)` — silent refetch by default
- Supported currencies: USD, INR, CNY, EUR, GBP, JPY

### ExpenseProvider (`context/ExpenseContext.tsx`)
```ts
const { expenses, setExpenses, fetchExpenses, loading, loadingMore, hasMore, currentPage, error, setError, updateExpense, setMasterKey } = useExpenses();
```
- Manages expense list with pagination, filtering, sorting
- Decrypts encrypted payloads using master key
- Handles both old array and new paginated API responses (backwards compat)

---

## 8. UI Components

### Dashboard (`app/components/Dashboard.tsx`)
- Main view with 5 tabs: Collections, Journal, Insights, Rooms, Wallet
- Mobile bottom nav + desktop tab navigation
- Handles navigation state, modals (AddExpense, AddBook), and FAB

### Modals/Sheets
- **Modal** (`Modal.tsx`): Generic modal with optional sheet mode for mobile
- **BottomSheet** (`BottomSheet.tsx`): Draggable bottom sheet
- **AddTicketModal**: Full split expense creator (equal/manual/percentage/ratio) with live preview distribution
- **CreateRoomModal**: Name + currency selection
- **SettleModal**: Amount input with "Full" button
- **InviteLinkModal**: Copy invite link to clipboard
- **ExpenseDrawer**: Action menu (view/edit/delete) for tickets
- **AccountSheet**: Mobile account sheet (avatar, balance, actions)

### Room Components
- **RoomList**: Fetches rooms via SWR, manages navigation state
- **RoomCard**: Room summary with balance indicator + member avatars
- **RoomView**: 3 tabs (Expenses, Balances, Members), invite button
- **RoomTickets**: Paginated ticket list with detail drawer, edit/delete menus, load more
- **RoomBalances**: Net balance summary, "You Owe" and "Owed to You" sections, settle buttons
- **RoomMembers**: Member list with leave room (double-confirm)

### Data Components
- **ExpenseList**: Filterable/sortable/paginated expense table with inline editing & drawer
- **ExpenseTableRow**: Individual expense row
- **ExpenseBookList**: Grid of expense books
- **InsightsView**: Aggregated spending charts (daily/weekly/monthly)
- **MinimalBarChart**: Custom bar chart with category breakdowns
- **SmartCategoryInput**: Category autocomplete (uses `/api/categories`)

### Layout Components
- **ActionFab**: Floating action button (add expense/book)
- **BottomNav**: Mobile bottom nav
- **FullScreenLoader**: Loading overlay
- **Skeletons**: Loading skeleton components

---

## 9. Crypto Layer (E2E Encryption)

### Key Hierarchy
```
Passphrase → PBKDF2 (SHA-512, 600K iterations) → Wrapping Key
                                                      ↓ AES-256-GCM
                                                 Master Key (AES-256)
                                                      ↓ AES-256-GCM
                                                 Private Key (RSA-4096)
Recovery Key (256-bit random) → AES-256-GCM → Master Key (recovery path)
```

### Architecture
| Module | Purpose |
|--------|---------|
| `services/aes.service.ts` | AES-256-GCM encrypt/decrypt |
| `services/asymmetric.service.ts` | RSA-OAEP key pair generate/encrypt/decrypt |
| `services/keyDerivation.service.ts` | PBKDF2 key derivation (SHA-512, 600K iterations) |
| `services/payloadEncryption.service.ts` | Encrypt/decrypt expense & book payloads |
| `services/orchestrator.ts` | Setup/unlock/rewrap orchestration |
| `services/recoveryKey.service.ts` | Recovery key generation/import |
| `services/keyAccess.ts` | Public key fetch (own + other users) |
| `indexeddb/cacheManager.ts` | In-memory + IndexedDB key caching |
| `indexeddb/db.ts` | IndexedDB singleton connection |
| `indexeddb/masterKeyStore.ts` | Encrypted master key cache |
| `indexeddb/privateKeyStore.ts` | Encrypted private key cache |
| `indexeddb/roomKeyStore.ts` | Encrypted room key cache |
| `utils/encoding.ts` | Base64url, hex, UTF-8 conversions |
| `utils/keySerializer.ts` | JWK import/export |

### Flow
1. **Setup:** Passphrase → derive wrapping key → generate AES master key + RSA key pair → encrypt private key with master key → encrypt master key as recovery envelope → save to server + indexeddDB cache
2. **Unlock:** Fetch keys from server → derive wrapping key from passphrase → decrypt master key → decrypt private key → cache in memory + IndexedDB
3. **Usage:** Write → master key encrypts payload → server stores `encryptedPayload`. Read → fetch from server → decrypt with cached master key
4. **Lock:** Clear in-memory keys, remove IndexedDB cache

### UseEncryption Hook (`hooks/useEncryption.ts`)
```ts
const { status, isLoading, isUnlocked, unlockedKeys, error, setup, unlock, lock, refreshStatus, publicKey } = useEncryption();
```
- Fetches `GET /api/user/encryption/status` via SWR
- `setup(passphrase)` → returns recovery key string
- `unlock(passphrase)` → returns boolean
- Multi-tab sync via BroadcastChannel

### IndexedDB Cache Manager (`crypto/indexeddb/cacheManager.ts`)
```ts
unlockKeys(userId, passphrase, encryptedMasterKeyJson, encryptedPrivateKeyJson, salt) // → UnlockedKeys
lockKeys() // clears memory + IndexedDB
getMasterKey(), getPrivateKey(), getCachedUserId()
setInMemoryKeys(masterKey, privateKey, userId) // for passphrase-free rehydration
hydrateFromCache(userId) // → HydrationResult
logoutCleanup() // full cleanup
onSyncEvent(listener) // multi-tab sync
```

**State of completion:** Encryption UI is missing. The `useEncryption` hook and APIs exist but no UI in the main app flow prompts users to set up/unlock encryption.

---

## 10. Utility Functions

### roomCurrency.ts
```ts
toSmallestUnit(amount, currency)        // → integer (cents/paise/etc)
fromSmallestUnit(amount, currency)      // → float
formatRoomCurrency(amount, currency)    // → formatted string
getCurrencySymbol(currency)             // → symbol string
CURRENCY_MULTIPLIERS: USD=100, INR=100, EUR=100, GBP=100, JPY=1, CNY=100
```

### currencyConverter.ts (mock rates)
```ts
convertCurrency(amount, from, to)       // → converted amount
THRESHOLD_INR = 83                      // minimum wallet threshold in INR
supportedCurrencies                     // ["USD", "INR", "CNY", "EUR", "GBP", "JPY"]
```
Rates (all relative to USD): INR=83.5, CNY=7.2, EUR=0.92, GBP=0.79, JPY=156

### normalizeCategory.ts
```ts
normalizeCategoryName(input)            // → lowercase trimmed
recordCategoryUsage(userId, displayName)// atomic upsert with $inc usageCount
```

### aggregateExpenses.ts
```ts
aggregateExpenses(expenses, timeFrame, year, month, walletCurrency)
// → BarData[] with label, date, total, breakdown[] (for charting)
// timeFrame: "Daily" | "Weekly" | "Monthly"
// Converts all amounts to wallet currency
```

### Others
```ts
formatCurrency(amount, currency)        // Intl.NumberFormat
formatDate(date), formatDateTime(date)  // en-US locale
```

---

## 11. Key Patterns & Conventions

### API Route Pattern
```ts
export async function GET/POST/PUT/DELETE(req: Request, { params }: { params: Promise<{ id }> }) {
  const session = await getCachedSession(await headers());
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    // ... operation
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Transaction Pattern (MongoDB)
```ts
const mongoSession = await mongoose.startSession();
mongoSession.startTransaction();
try {
  // ... operations
  await mongoSession.commitTransaction();
} catch (txErr) {
  await mongoSession.abortTransaction();
  throw txErr;
} finally {
  mongoSession.endSession();
}
```
Used for: wallet balance updates, room ticket creation/editing/deletion, room join/leave.

### Component Pattern (Mobile Bottom Sheet)
```ts
import { useDraggableSheet } from "@/app/hooks/useDraggableSheet";

export default function Modal({ isOpen, onClose, ... }) {
  const { sheetRef, style, handlers, isClosing } = useDraggableSheet({ isOpen, onClose });

  return (
    <div className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 ${isClosing ? 'pointer-events-none' : ''}`}>
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm ...`} onClick={onClose} />
      {/* Sheet */}
      <div ref={sheetRef} style={style} className="relative ... w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl ...">
        {/* Drag handle (mobile only) */}
        <div className="w-full pt-4 pb-2 drag-handle-area ... sm:hidden" {...handlers}>
          <div className="w-12 h-1.5 bg-[var(--border)] rounded-full mx-auto" />
        </div>
        {/* Content */}
      </div>
    </div>
  );
}
```

### Pagination Convention
All list endpoints use: `?page=N&limit=M` with `MAX_LIMIT=50`, `DEFAULT_LIMIT=20`.
Response format: `{ data: [...], hasMore: boolean, page: number, total: number }`

### Backwards Compatibility
Expense list API returns both old array format and new paginated format:
```ts
const rawData = Array.isArray(result) ? result : (result.data ?? []);
```

### Model Registration Pattern
All Mongoose models use the singleton pattern:
```ts
const Model = models.ModelName || model<IModel>("ModelName", ModelSchema);
```
Some models also do side-effect imports for registration (e.g., `Room.ts` imports `./RoomBook`).

---

## 12. State of Completion

### ✅ Fully Built & Functional
- Authentication (sign up, sign in, email verification, password reset, Google OAuth)
- Dashboard (Collections, Journal, Insights, Rooms, Wallet tabs)
- Expenses CRUD with wallet integration (balance validation, refund on delete, threshold check)
- Expense Books CRUD with encrypted payload support
- Room Expenses (full system with 4 split types, settlements, balance tracking)
- Wallet (add money, currency conversion, threshold)
- Profile management (name editing, profile picture upload)
- Custom Categories (auto-tracked via `recordCategoryUsage()`)
- E2E Encryption (key generation, storage, client-side encrypt/decrypt, IndexedDB caching, recovery key)
- PWA (service worker, install prompt, manifest)
- Insights (daily/weekly/monthly aggregation, bar chart, CSV export)
- Email (Nodemailer-based for verification + password reset)
- Rate limiting (in-memory in proxy middleware)
- Session caching (30s TTL cache)

### 🏗️ Partially Built / Needs Attention
- **Encryption UI:** No UI in the main app flow prompts users to set up/unlock encryption. The `useEncryption` hook and all APIs exist but are not wired into the UX.
- **Room Key Encryption:** `crypto/indexeddb/roomKeyStore.ts` exists but room-level encryption isn't wired into the room ticket flow.
- **Tests:** `crypto/__tests__/` directory exists but is empty. No other test files.
- **Analytics/Monitoring:** Not present.
