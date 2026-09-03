# Kharche Technical Architecture and Engineering Report

**Application:** Kharche — Multi-Currency Expense Tracker  
**Document type:** Technical architecture, engineering practices, and implementation assessment  
**Repository scope:** Current application implementation and `KHARCHE_ARCHITECTURE.md` reference  
**Status:** Current-state report

## 1. Purpose and scope

Kharche is a full-stack personal and group expense management application. It supports personal expenses, expense books, wallet management, multiple currencies, spending insights, collaborative rooms, settlements, authentication, encrypted payload storage, progressive web application behavior, and push notifications.

This report explains not only what the application contains, but also how its architectural decisions work and why they are appropriate for the product. It covers runtime boundaries, data ownership, transaction design, caching, client state, privacy controls, deployment, reliability, and engineering trade-offs.

The report reflects the code currently present in the repository. A capability is described as **implemented** only where the relevant code exists. Features whose services or APIs exist but are not connected to the primary user flow are described as **partially wired**. Testing and operational capabilities that are not present are identified explicitly rather than inferred.

## 2. Executive summary

Kharche is implemented as a modular monolith using Next.js App Router and TypeScript. The browser renders the application and manages interactive state through React Context and SWR. Next.js route handlers provide the backend API, while MongoDB stores users, expenses, rooms, tickets, balances, categories, and encryption metadata.

The architecture deliberately keeps related business operations in one deployable application. This is important because wallet changes, expense creation, room ticket updates, and balance changes often require multiple database writes to succeed or fail together. Keeping these operations within a single application boundary reduces network coordination and makes MongoDB transaction boundaries straightforward.

The main architectural characteristics are:

- **Server-authoritative business rules:** the API validates identity, ownership, limits, balances, membership, currency conversion, and transaction invariants instead of trusting client state.
- **Transactional financial operations:** wallet and group-balance updates use MongoDB transactions to avoid partial state.
- **Short-lived caching:** Better Auth uses Redis secondary storage, while local request/session memoization and in-flight promise deduplication reduce repeated authentication work.
- **Responsive client state:** SWR handles server state, React Context handles cross-cutting application state, and optimistic mutations provide immediate feedback with rollback on failure.
- **Privacy-aware encryption:** Web Crypto operations run in the browser. The server stores encrypted payloads and key envelopes rather than passphrases or plaintext private keys.
- **PWA-oriented delivery:** a manifest, service worker, install flow, and web-push handling allow the application to behave like an installable application without forcing offline data caching.

The architecture is strong for a product of this scope, but it has known limits. Automated tests are not currently present, analytics and monitoring are absent, the rate limiter is process-local, and encryption is only partially integrated into the user experience and room workflow.

## 3. Product capabilities and technology stack

### 3.1 Capability areas

Kharche is organized around several related domains:

| Domain | Responsibility | Primary implementation areas |
|---|---|---|
| Authentication | Sign-up, sign-in, verification, password reset, Google OAuth, sessions | `lib/auth.ts`, `lib/session.ts`, `app/api/auth/` |
| Personal expenses | Expense CRUD, filtering, pagination, categories, books | `app/api/expenses/`, `app/api/expense-books/`, `models/Expense.ts` |
| Wallet | Balance, supported currencies, minimum-balance enforcement | `app/api/user/wallet/`, `context/WalletContext.tsx` |
| Group rooms | Members, tickets, splits, balances, settlements, invites | `app/api/rooms/`, `lib/rooms/`, `models/Room*.ts` |
| Insights | Daily, weekly, and monthly aggregation and charts | `utils/aggregateExpenses.ts`, `InsightsView.tsx` |
| Privacy | Client-side key generation, encrypted payloads, recovery | `crypto/`, `hooks/useEncryption.ts` |
| PWA and notifications | Install prompt, service worker, push notifications | `public/sw.js`, `PwaRegistry`, push context/components |

### 3.2 Technology responsibility matrix

| Technology | Responsibility | Architectural reason |
|---|---|---|
| Next.js 16 App Router | Full-stack routing, layouts, API route handlers, server integration | It provides one application boundary for UI and backend operations while supporting server/client component separation. |
| React 19 | Interactive UI and component composition | The dashboard has many independent interactive surfaces, so component-based composition keeps UI behavior localized. |
| TypeScript | Static typing across UI, API, domain, and crypto code | Financial and identity-related data benefits from explicit shapes and constrained unions. |
| Tailwind CSS v4 and CSS variables | Responsive styling and design tokens | Shared variables support consistent light/dark surfaces while utility classes keep component styling close to markup. |
| SWR | Remote/server state, cache, revalidation, optimistic mutations | Expense and room lists are server-owned data that need revalidation and mutation coordination. |
| React Context | Cross-cutting client state | Wallet, notifications, processing status, navigation, push, and expense coordination would otherwise require prop drilling. |
| MongoDB | Primary persistent store | Document modeling fits user-owned records and nested room distributions while supporting transactions and indexes. |
| Mongoose | Domain model definitions and database access | Schemas provide model-level consistency and reusable query/model conventions. |
| Better Auth and MongoDB adapter | Authentication lifecycle and auth persistence | Authentication is a security-sensitive subsystem better delegated to a specialized library than rebuilt in application code. |
| Upstash Redis | Session secondary storage | Session reads are frequent and benefit from low-latency, expiring server-side storage. |
| Web Crypto API | Browser-side encryption | Key operations remain in the browser and use platform cryptography rather than application-level cryptographic primitives. |
| IndexedDB | Encrypted key cache | It permits browser persistence without placing plaintext keys in ordinary application state or cookies. |
| Service worker and Web Push | Installability and notifications | The service worker provides the browser lifecycle required for PWA and push behavior. |
| Render | Production process hosting | The application can be built and started as one Node.js service with external managed dependencies. |

## 4. System architecture and runtime boundaries

### 4.1 Modular monolith structure

The application is a modular monolith rather than a collection of independently deployed services. Its major internal boundaries are:

1. **Presentation layer:** pages, dashboard components, room components, forms, sheets, charts, loaders, and navigation.
2. **Client state layer:** SWR configuration and React Context providers.
3. **HTTP/API layer:** Next.js route handlers under `app/api/`.
4. **Server library layer:** authentication, session lookup, database connection, email, exchange-rate access, and room domain services.
5. **Persistence layer:** Mongoose models and Better Auth’s raw MongoDB adapter.
6. **Browser privacy layer:** Web Crypto services, IndexedDB stores, key orchestration, and encryption hooks.
7. **Delivery layer:** service worker, PWA registration, manifest assets, and Render deployment configuration.

This is a deliberate boundary rather than an accidental lack of services. Personal expenses, wallet balance, room tickets, and room statistics are closely related financial data. Splitting them into services would introduce distributed transaction and consistency problems before the product requires that complexity. A modular monolith preserves internal separation while keeping high-value invariants local to one process and one database transaction.

### 4.2 App Router organization

The `app/` directory groups pages and API handlers by product capability. Authentication pages are separate from the main dashboard, while nested route segments represent resource identity such as an expense book ID, room ID, or ticket ID. This naming convention makes the public HTTP surface discoverable and allows the API to apply resource-specific authorization checks.

The root layout in `app/layout.tsx` establishes global fonts, metadata, PWA registration, SWR, notifications, push subscription state, room activation, processing state, wallet state, navigation state, and expense state. Pages can therefore focus on composition while cross-cutting behavior is initialized once.

> **[DIAGRAM PLACEHOLDER: System context diagram — show the browser/PWA, the Next.js application, MongoDB, Redis, email provider, Google OAuth, exchange-rate service, and push service. Add a short caption describing request, authentication, persistence, and notification boundaries.]**

> **[DIAGRAM PLACEHOLDER: Container/component diagram — show pages/components, API route handlers, React Context/SWR, server libraries, domain utilities, Mongoose models, Better Auth, and external services.]**

> **[DIAGRAM PLACEHOLDER: Root provider hierarchy — show `PwaRegistry`, `SWRProvider`, notifications, push, room activation, processing, wallet, navigation, and expense providers in their nesting order.]**

## 5. Request lifecycle and data flow

A typical authenticated request follows this sequence:

1. The browser initiates a fetch from a page, SWR hook, or mutation handler.
2. `proxy.ts` applies the process-local IP rate limit and identifies public routes.
3. Protected browser routes are checked through Better Auth’s session endpoint. An absent session causes a redirect to `/sign-in`.
4. The API route independently calls `getSession(await headers())`. This is an important security boundary because a client-side route guard cannot protect an API by itself.
5. `getSession` uses its short-lived process-local cache and in-flight promise map before asking Better Auth for the session.
6. Better Auth can use Redis secondary storage and, on a Redis miss, fall back to MongoDB because `storeSessionInDatabase` is enabled.
7. The route connects through the shared Mongoose connection in `lib/db.ts`.
8. The route validates request data, checks ownership or membership, performs the domain operation, and starts a MongoDB transaction when multiple writes must remain consistent.
9. The route returns a JSON response with a meaningful status code.
10. SWR either updates, rolls back, or revalidates its cache depending on the mutation result.

The client is intentionally not authoritative. It can provide a fast optimistic experience, but the server recalculates balances, checks limits, verifies membership, and persists the final state.

> **[DIAGRAM PLACEHOLDER: Authenticated request sequence — show browser, proxy, local session cache, Redis, Better Auth, MongoDB fallback, route handler, transaction, and response/revalidation.]**

## 6. Authentication, authorization, and session architecture

### 6.1 Authentication capabilities

`lib/auth.ts` configures Better Auth with:

- MongoDB persistence through `@better-auth/mongo-adapter`.
- Transaction support for authentication data operations.
- Email/password authentication.
- Required email verification before normal use.
- Password reset links sent through the configured email service.
- Google OAuth.
- A custom user currency field with an INR default.

Delegating the authentication lifecycle to Better Auth reduces the amount of custom security-sensitive code. The application still owns authorization decisions for its resources, but it does not need to implement password verification, session cookie issuance, verification tokens, or OAuth protocol handling itself.

### 6.2 Multiple authentication boundaries

The proxy protects navigation and provides a fast redirect for unauthenticated browser requests. API routes still call `getSession` and return `401 Unauthorized` when no session is present. These checks serve different purposes:

- The proxy improves navigation behavior and prevents protected pages from rendering unnecessarily.
- The API check protects data and mutations even if a request bypasses the browser UI.
- Resource queries also scope records to the authenticated user or verify room membership.

This layered approach follows the principle that authorization must be enforced at the resource boundary, not merely at the UI boundary.

### 6.3 Session caching and fallback design

There are two related caching layers:

- Better Auth’s Redis secondary storage stores serialized session data with an expiration bounded to the session lifetime.
- `lib/session.ts` keeps a short-lived process-local session result and deduplicates simultaneous lookups for the same session cookie.

The local cache avoids repeating the same auth call during bursts of API activity. The in-flight map is particularly useful when several components load at once: concurrent requests share one pending promise instead of creating several identical session lookups.

The Redis configuration uses a 60-second cookie-cache window but preserves the Redis key for the longer session lifetime. `storeSessionInDatabase: true` is important because an expired or missing Redis value can be recovered from MongoDB rather than forcing a valid user to sign in again. Better Auth can then re-establish the secondary cache.

Logout and profile-related writes invalidate or replace the relevant session state. The short cache window is a trade-off: it improves read performance but permits a bounded period of stale session data within a process. The application chooses a short duration rather than a long cache because authentication state changes must become visible promptly.

### 6.4 Rate limiting

`proxy.ts` implements a simple 150-request-per-minute limit keyed by `x-forwarded-for`. Expired entries are periodically removed from the in-memory map. This is a useful first layer against accidental request storms and basic abuse, with low operational cost.

The trade-off is that the limiter is process-local. Multiple Render instances do not share the map, and a restart resets it. A distributed limiter backed by Redis would be more consistent for horizontal scaling. The current implementation should therefore be treated as a lightweight guard, not a complete abuse-prevention system.

> **[DIAGRAM PLACEHOLDER: Authentication/session sequence — show sign-in, session cookie, proxy, Better Auth, Redis hit, Redis miss, MongoDB fallback, cache population, and logout eviction.]**

## 7. Persistence and data modeling

### 7.1 Core entities

The data model separates personal records from group records while preserving clear ownership:

- **User:** identity, email verification state, profile image, wallet balance, preferred currency, room references, and encryption status.
- **Expense:** user-owned amount, currency, category, date, optional book reference, and encrypted description/payload fields.
- **ExpenseBook:** user-owned grouping of expenses with title, description, currency, and expense references.
- **Room:** group identity, members, associated room book, and room currency.
- **RoomBook:** a room-level collection of ticket references.
- **RoomTicket:** payer, participants, total amount, split type, distribution, and ticket type.
- **RoomStats:** per-user mirrored balances inside a room.
- **UserEncryption:** public key, encrypted private/master-key envelopes, salt, recovery envelope, and encryption version.
- **CustomCategory:** user-specific normalized category name, usage count, and recency metadata.

The model design uses references for ownership and relationships rather than embedding entire activity histories inside user documents. This prevents user or room documents from growing without bound and allows expense/ticket lists to be paginated.

### 7.2 Indexes and constraints

The models define indexes for common access paths, including user/date, user/category/date, user/book/date, room/book ticket access, unique room-stat pairs, and unique user/normalized-category pairs. These indexes support the queries used by filtering, sorting, room lookup, and autocomplete.

Compound uniqueness on `(roomId, userId)` ensures one statistics record per user in a room. Category normalization prevents duplicate logical categories that differ only by case or whitespace. These constraints move important consistency rules into the persistence layer rather than relying only on application code.

### 7.3 Connection and model reuse

`lib/db.ts` caches the Mongoose connection and pending connection promise on a global object. This is useful in development because hot module reloading can otherwise create repeated connections. It is also useful in serverless-style environments because a warm process can reuse an established pool.

The connection config uses a bounded pool, connection and socket timeouts, disabled command buffering, IPv4 selection, and retryable promise reset after a failed connection. The purpose is to fail clearly when the database is unavailable and avoid building up unbounded connection or queued-operation state.

Mongoose models use the standard `models.ModelName || model(...)` pattern. This prevents model recompilation errors during development reloads.

> **[DIAGRAM PLACEHOLDER: Entity relationship diagram — show users, expenses/books, rooms/tickets/stats, categories, and encryption metadata. Mark ownership fields, references, and unique constraints.]**

## 8. Personal expense and wallet domain

### 8.1 Server-side validation

The expense API does not trust client values. Creation validates maximum amount, required category, category length, encrypted description presence, currency conversion availability, and wallet threshold. Reads validate pagination bounds and apply filters for category, book, date, month, year, sort field, sort direction, and timezone offset.

Pagination is bounded to prevent an unrestricted client request from loading the entire collection. Normal list queries have a smaller limit, while date-filtered aggregation views may use a larger but still bounded limit. This protects memory and response size while retaining useful reporting behavior.

### 8.2 Transactional expense creation

Expense creation in `app/api/expenses/route.ts` performs the following work inside a MongoDB transaction:

1. Load the authenticated user.
2. Convert the submitted expense amount to the wallet currency using server-side rates.
3. Calculate the resulting wallet balance.
4. Enforce the minimum balance threshold.
5. Insert the expense.
6. Decrement and save the wallet balance.
7. Add the expense reference to the selected expense book, if present.
8. Commit all writes together.

If any step fails, the transaction is aborted. This avoids situations where an expense exists but the wallet was not charged, or a wallet was charged but the expense was not recorded. The implementation also records category usage after the core transaction so category autocomplete metadata does not block the primary financial operation.

### 8.3 Currency and money handling

Personal expense amounts use currency conversion at the API boundary, and room amounts use integer smallest units such as cents or paise. Integer arithmetic is preferred for group balances because binary floating-point values can accumulate rounding errors. Conversion and formatting are kept separate from persistence and business decisions.

A minimum-wallet threshold protects the product’s business rule that a user should not spend below a configured reserve. The server recalculates this threshold in the user’s wallet currency rather than accepting a client-calculated value.

> **[DIAGRAM PLACEHOLDER: Expense creation transaction — show input validation, exchange-rate lookup, wallet read, expense insert, wallet update, optional book reference, commit, and rollback.]**

## 9. Rooms, splitting, settlement, and balance consistency

### 9.1 Pure split calculation

`lib/rooms/splitCalculator.ts` contains a pure `calculateSplit` function. It accepts a split type, total amount, ordered members, and optional split data, then returns a distribution array. It has no database dependency, which makes the core financial calculation deterministic and independently testable.

Supported modes are:

- **Equal:** divides the total across participants.
- **Manual:** requires explicit integer amounts whose sum equals the total.
- **Percentage:** converts percentages to integer amounts and requires an approximately 100% total.
- **Ratio:** calculates proportional integer amounts from positive ratios.

The remainder caused by integer division is assigned deterministically to the first participant. This ensures the final distribution always equals the original total and avoids ambiguous one-unit discrepancies.

`validateSplitInput` verifies that all involved users belong to the room and that no user is duplicated. These checks prevent an otherwise valid-looking split from referencing an unauthorized or impossible participant set.

### 9.2 Mirrored balances

`balanceEngine.ts` stores a pairwise representation of room balances. If one user owes another an amount, the corresponding reverse entry is updated by the negative amount. This makes each user’s view straightforward to read and supports “you owe” and “owed to you” sections without recalculating every ticket at render time.

The engine receives a MongoDB client session and performs both sides of the update inside the caller’s transaction. This is important because updating only one side would violate the balance model’s invariant.

### 9.3 Ticket lifecycle and reversibility

Room ticket creation calculates the distribution and applies balance effects. Editing a ticket reverses the old effect before applying the new one. Deleting a ticket reverses its balance effects. Settlements are recorded as explicit settlement tickets rather than hidden balance mutations, providing a traceable history.

Room join and leave operations also require transaction boundaries because they modify membership, statistics documents, and room references together. Leaving is blocked when outstanding balances remain, which protects the meaning of the remaining users’ balances.

This design favors traceability and reversible accounting over storing only a final net value. It makes corrections possible while preserving the original domain event represented by each ticket.

> **[DIAGRAM PLACEHOLDER: Room expense lifecycle — show ticket input, membership validation, split calculation, distribution, mirrored `RoomStats` updates, edit reversal, deletion reversal, settlement, and commit/rollback.]**

## 10. Client architecture, state, and UX engineering

### 10.1 SWR for server-owned state

`app/components/SWRProvider.tsx` configures SWR with reconnect revalidation, focus throttling, request deduplication, and limited retries. These defaults recognize that expense, wallet, and room data are owned by the server and may change outside the currently rendered component.

Mutations use SWR’s mutation APIs with optimistic data, rollback on error, cache population, and revalidation. The resulting interaction is immediate while retaining server authority: the UI predicts the result, the server confirms it, and an error restores the previous state.

Pagination and “load more” behavior keep large collections manageable. The expense provider also accepts both array and paginated response formats, which protects the client from a transition between older and newer API response shapes.

### 10.2 Context responsibilities

Context providers are divided by responsibility rather than putting all application state into one global store:

- `ExpenseContext` manages expense records, filters, pagination, decryption, and the active master key.
- `WalletContext` manages wallet balance, currency, and wallet refresh behavior.
- `ProcessingContext` tracks per-item asynchronous operations so buttons and rows can show precise progress.
- `NotificationContext` provides consistent success, error, warning, and informational toasts.
- Navigation, push subscription, room activation, and encryption hooks handle their own cross-cutting behavior.

This separation limits unrelated reactivity and gives components narrow, meaningful interfaces.

### 10.3 Component and responsive design

The dashboard separates collections, journal, insights, rooms, and wallet views. Room-specific components are decomposed into lists, cards, tickets, balances, members, and action modals. Shared components cover modal behavior, bottom sheets, loaders, skeletons, error messages, navigation, and action controls.

The UI supports mobile and desktop interaction patterns independently. Bottom navigation is optimized for small screens, while desktop tabs provide a wider navigation surface. Modals can act as centered dialogs on desktop and draggable bottom sheets on mobile. Loading skeletons, full-screen loaders, processing IDs, and notifications provide explicit feedback during network operations.

> **[DIAGRAM PLACEHOLDER: Client state flow — show API fetchers, SWR cache, Context providers, page components, optimistic mutation, rollback, and revalidation.]**

## 11. Encryption and privacy architecture

### 11.1 Browser-only cryptographic boundary

The crypto orchestration in `crypto/services/orchestrator.ts` runs through the browser’s Web Crypto API. The server receives encrypted values and key envelopes but does not receive the user’s passphrase or plaintext private key during normal setup.

The key hierarchy is:

1. A passphrase is processed through PBKDF2 with a stored salt to derive a wrapping key.
2. The wrapping key encrypts an AES-256 master key.
3. The master key encrypts the RSA private-key JWK.
4. The public key is stored for encryption/key exchange use.
5. A randomly generated recovery key encrypts a separate master-key envelope.
6. Encrypted application payloads are protected with the master key.

AES-GCM supplies authenticated encryption for payloads and key envelopes. RSA-OAEP with SHA-256 and a 4096-bit key pair supports asymmetric operations. Key serialization uses JWK so the browser can persist transferable key representations without exposing raw key material to the server.

### 11.2 Unlock, caching, and recovery

On unlock, the browser fetches the encrypted key material, derives the wrapping key from the passphrase, decrypts the master key, and then decrypts/imports the private key. The unlocked keys may be held in memory and cached through IndexedDB facilities. Lock and logout cleanup remove active key state, while BroadcastChannel support synchronizes lock/unlock events across tabs.

The recovery flow uses the recovery key to decrypt the master-key envelope and can recover the passphrase from its encrypted envelope. This creates a recovery path without storing the recovery key itself on the server.

The architecture separates encrypted data storage from key possession. That is the main privacy benefit: a database compromise should expose ciphertext and protected envelopes rather than immediately readable descriptions or plaintext private keys. The trade-off is increased client complexity, key lifecycle responsibility, recovery UX requirements, and the possibility that losing both the passphrase and recovery key makes data unrecoverable.

### 11.3 Current encryption boundary and limitations

The crypto services, APIs, IndexedDB stores, and `useEncryption` hook exist. However, the architecture reference identifies two incomplete integrations:

- The primary application flow does not yet provide a complete encryption setup/unlock experience.
- Room-level encryption is not connected to the room ticket flow.

Therefore, the application should not be described as encrypting every feature end to end. Personal encrypted payload support exists, but the full UX and room coverage remain partially wired.

> **[DIAGRAM PLACEHOLDER: Encryption key hierarchy — show passphrase, PBKDF2, wrapping key, master key, private key, recovery key, encrypted payloads, server storage, and browser storage.]**

> **[DIAGRAM PLACEHOLDER: Encryption data-flow sequence — show setup, unlock, encrypted write, server persistence, read/decrypt, lock, logout cleanup, and recovery paths.]**

## 12. PWA, notifications, and deployment

### 12.1 PWA behavior

`PwaRegistry` registers the service worker and supports installation behavior. The service worker calls `skipWaiting` and `clients.claim` so an updated worker can take control promptly.

The fetch handler intentionally performs no caching. This is a conservative choice for a financial application: it avoids serving stale application data and ensures new deployments are reflected immediately. The trade-off is that the application does not provide a full offline experience.

### 12.2 Push notifications

The service worker parses push payloads and displays notifications with configurable title, body, icon, badge, tag, timestamp, and navigation data. Tags permit browser-side replacement/deduplication of related notifications. Clicking a notification first tries to focus an existing matching window and otherwise opens the target URL.

This keeps notification rendering outside the React runtime, allowing notifications to be displayed even when the application page is not active.

### 12.3 Deployment

`render.yaml` describes a Node web service that installs dependencies, builds with `npm run build`, and starts with `npm run start`. Database, authentication, OAuth, application URL, and email-related configuration are injected as environment variables rather than committed to source control.

The project also includes Capacitor dependencies for potential Android and iOS packaging. Those dependencies indicate a mobile packaging path, but the verified web runtime remains the Next.js/PWA deployment described above.

> **[DIAGRAM PLACEHOLDER: Deployment topology — show browser/PWA, Render-hosted Next.js process, MongoDB, Upstash Redis, Google OAuth, email provider, exchange-rate source, and push infrastructure.]**

## 13. Engineering practices and rationale

### 13.1 TypeScript and explicit domain types

The project uses TypeScript across application, API, model, and crypto code. Union types such as room split types and ticket types constrain domain values at compile time. Interfaces for split input, encrypted data, session values, and model fields make contracts visible.

The benefit is early detection of invalid combinations and clearer maintenance boundaries. The trade-off is that runtime validation is still required because HTTP input is untrusted; TypeScript alone cannot validate JSON received from a browser.

### 13.2 Server-side validation and authorization-scoped queries

Routes validate amounts, lengths, formats, pagination, membership, and ownership. Queries commonly include `userId` or room membership criteria rather than loading a record by ID alone.

This prevents clients from changing the UI to access another user’s resource and reduces accidental data leakage. It also means the same protection applies to non-browser clients and direct API calls.

### 13.3 Transactions for financial invariants

Wallet changes, expense creation, room tickets, balance updates, joins, and leaves use MongoDB sessions and transactions where multiple records must move together.

Transactions are justified here because a partial financial write is worse than a failed request. The trade-off is additional database overhead and a requirement for a MongoDB deployment that supports transactions, but the consistency benefit is central to the product.

### 13.4 Pure domain calculations

The split calculator has no database or framework dependency. Pure functions are easier to reason about, deterministic across environments, and straightforward to unit test. Keeping calculation separate from persistence also prevents UI formatting or database state from changing the financial result.

### 13.5 Integer monetary arithmetic

Room distributions use the smallest currency unit and integer values. Remainders are allocated deterministically. This avoids floating-point drift and guarantees that all participant shares sum exactly to the ticket total.

### 13.6 Reusable connections and models

Global connection/promise caching and Mongoose model reuse support development HMR and warm server processes. Bounded connection pools and timeout settings reduce the risk that temporary database issues produce unbounded resource consumption.

### 13.7 Pagination and bounded queries

List endpoints accept page and limit parameters but enforce maximum limits. This controls response size, database work, and browser memory. It also establishes predictable API behavior for UI “load more” patterns.

### 13.8 Optimistic updates with rollback

SWR mutations can update the interface before the request completes, then roll back on failure and revalidate on success. Processing state is tracked per item so a user can distinguish an active row operation from a global loading state.

The practice improves perceived responsiveness without surrendering consistency because the API remains authoritative.

### 13.9 Caching and in-flight deduplication

Redis reduces repeated session persistence reads, the local session map reduces repeated lookups within a process, and in-flight maps collapse simultaneous identical operations. Expiration and explicit deletion keep cache state bounded.

The design balances performance against freshness. Short-lived local caching is appropriate for session reads, while persistent session fallback prevents Redis expiration from appearing as an unexpected logout.

### 13.10 Browser/server separation for cryptography

Crypto logic is isolated under `crypto/` and exposed through hooks and service APIs. This prevents server handlers from needing access to passphrases and makes the privacy boundary explicit.

The trade-off is that encrypted data becomes dependent on client key availability and migration compatibility. Encryption versions stored in the data model provide a basis for future format evolution.

### 13.11 Environment-based configuration

Database URLs, auth secrets, OAuth credentials, application URLs, and email credentials are configured through environment variables. This avoids committing credentials and allows the same codebase to run across development and deployment environments.

The remaining operational responsibility is to ensure production environments provide all required values and do not log sensitive reset or verification links outside controlled development behavior.

### 13.12 Component and provider reuse

Common interaction patterns such as modals, draggable sheets, notifications, loaders, skeletons, and navigation are shared. This reduces inconsistent behavior and makes responsive design changes easier to apply across domains.

### 13.13 Backward-compatible response handling

The expense provider accepts both an older array response and the newer paginated object response. This is a pragmatic migration technique that reduces the chance that a server API improvement breaks an already deployed client.

The trade-off is temporary complexity: once all clients use the new contract, the compatibility branch can be removed to make the contract stricter.

### 13.14 Existing quality commands

The package defines `lint` and `build` scripts using ESLint and Next.js. These provide static and production-compilation checks. They are useful gates, but they do not currently replace behavioral tests for authorization, transactions, crypto, or room accounting.

## 14. Reliability, security, and performance assessment

### 14.1 Existing strengths

The current implementation includes several meaningful controls:

- Authentication checks in both navigation middleware and API routes.
- Resource ownership and room membership checks.
- MongoDB transactions around multi-record financial operations.
- Bounded pagination and request limits.
- Server-side currency conversion and wallet threshold validation.
- Integer room accounting and deterministic split rounding.
- Redis session storage with MongoDB fallback.
- In-flight request deduplication for repeated session/cache reads.
- Reused database connections with bounded pools and timeouts.
- Browser-only cryptographic operations and encrypted payload fields.
- Explicit HTTP error statuses for unauthorized, invalid, unavailable, and not-found cases.

### 14.2 Current constraints and risks

- **Process-local rate limiting:** the `Map` in `proxy.ts` is not shared across instances and resets on restart. Distributed deployment needs Redis-backed limiting for consistent enforcement.
- **No automated test suite:** the repository contains an empty crypto test directory and no broader test files. Regression risk is therefore highest around room balance reversal, authorization, transaction failure, and crypto interoperability.
- **No analytics or monitoring:** there is no visible metrics, tracing, or error-monitoring subsystem. Operational diagnosis will be difficult without external platform logs or additional instrumentation.
- **Error detail exposure:** some handlers return `error.message` directly. A production error policy should distinguish safe client messages from internal diagnostic details.
- **Session freshness window:** local session caching improves performance but can briefly retain stale session information. The short TTL limits this exposure, while explicit eviction should be used for security-sensitive state changes.
- **No offline data cache:** the PWA is installable but not an offline-first application. This is safer for freshness but means network access is required for current data.
- **Encryption integration coverage:** the cryptographic foundation is present, but the primary UX and room workflow are incomplete. Claims about encryption should remain scoped to supported payload paths.

## 15. Testing and quality strategy

### 15.1 Current state

The project defines lint and build commands, but no automated test suite is currently present. `crypto/__tests__/` exists but is empty, and the architecture reference records the broader testing gap.

### 15.2 Recommended test layers

A future test strategy should prioritize the highest-risk invariants:

1. **Unit tests:** `calculateSplit`, split validation, smallest-unit conversion, currency conversion, date filtering, category normalization, encryption encoding, AES-GCM round trips, PBKDF2 derivation, and key orchestration.
2. **Integration tests:** API authentication failures, cross-user ownership checks, expense transactions, wallet threshold behavior, expense-book references, room ticket creation/edit/delete reversal, settlement, join/leave constraints, and session fallback behavior.
3. **End-to-end tests:** sign-up and verification, sign-in, password reset, personal expense flow, wallet flow, room collaboration, notification navigation, and encryption setup/unlock/recovery once the UI is wired.
4. **Build/lint checks:** retain the existing static and production compilation commands in CI.

Pure functions should be tested first because they provide high confidence with low setup cost. Transaction and authorization integration tests are then essential because those behaviors cannot be validated reliably through type checking alone.

## 16. Operational considerations and future evolution

The modular monolith should remain the default evolution path until operational measurements demonstrate a need for service decomposition. The current internal boundaries allow targeted improvement without introducing distributed transactions prematurely.

Priority evolution areas are:

- Add structured logging with request IDs and safe error categorization.
- Add error tracking and metrics for API failures, transaction aborts, authentication failures, cache hit rates, and notification delivery.
- Replace the process-local rate limiter with distributed Redis-backed limiting when horizontal scaling is enabled.
- Add schema and encrypted-payload migration conventions tied to `encryptionVersion`.
- Complete encryption setup/unlock UX and connect room key management to room tickets.
- Add automated tests before significant changes to room accounting or cryptographic formats.
- Establish a consistent API error envelope so clients receive safe messages while logs retain diagnostics.
- Review session invalidation paths for profile changes, logout, password changes, and account recovery.
- Add database migration/index deployment procedures so production indexes remain aligned with model assumptions.

These improvements build on the existing architecture rather than requiring an immediate rewrite. For example, metrics can be added around current route handlers, distributed limiting can reuse the existing Redis dependency, and tests can target existing pure services before any restructuring.

## 17. Implementation status matrix

| Capability | Current status | Evidence | Follow-up concern |
|---|---|---|---|
| Email/password authentication | Implemented | `lib/auth.ts`, auth pages, Better Auth route | Add automated auth-flow tests. |
| Email verification | Implemented | Better Auth email verification configuration | Verify production email delivery and monitoring. |
| Google OAuth | Implemented/configured | `lib/auth.ts` social provider | Validate production redirect configuration. |
| Password reset | Implemented/configured | `lib/auth.ts`, `lib/email.ts` | Avoid exposing internal error details and monitor delivery. |
| Personal expenses CRUD | Implemented | `app/api/expenses/`, expense components | Add authorization and transaction integration tests. |
| Expense books | Implemented | `app/api/expense-books/`, `models/ExpenseBook.ts` | Add reference cleanup and lifecycle tests. |
| Wallet and currency handling | Implemented | wallet routes/context, expense transaction | Add concurrency and threshold tests. |
| Insights and aggregation | Implemented | `utils/aggregateExpenses.ts`, `InsightsView.tsx` | Add date/timezone and conversion tests. |
| Custom categories | Implemented | `app/api/categories/`, `normalizeCategory.ts` | Add normalization/uniqueness tests. |
| Room expenses and split modes | Implemented | `splitCalculator.ts`, room routes/components | Add comprehensive split and invalid-input tests. |
| Room balances and settlements | Implemented | `balanceEngine.ts`, `RoomStats`, room routes | Add transaction rollback and reversal tests. |
| Session Redis cache | Implemented | `lib/auth.ts`, Redis secondary storage | Use distributed controls consistently at scale. |
| MongoDB session fallback | Implemented | `storeSessionInDatabase: true` | Monitor Redis/MongoDB cache behavior. |
| Process-local session memoization | Implemented | `lib/session.ts` | Review freshness and invalidation coverage. |
| Process-local rate limiting | Implemented with scaling limitation | `proxy.ts` | Replace with distributed rate limiting for multi-instance deployments. |
| Client-side encryption services | Implemented as services | `crypto/`, `hooks/useEncryption.ts` | Complete UX and migration tests. |
| Encryption setup/unlock UX | Partially wired | Encryption APIs and hook exist | Integrate into the main application flow. |
| Room-level encryption | Not fully wired | `roomKeyStore.ts` exists; room flow does not use it | Connect key lifecycle and ticket payload encryption. |
| PWA installation | Implemented | `PwaRegistry`, manifest/assets, `public/sw.js` | Add installation/browser compatibility checks. |
| Web push handling | Implemented in service worker | `public/sw.js`, push-related application code | Add delivery observability and end-to-end tests. |
| Automated tests | Not implemented | Empty crypto test directory and no test suite | Add unit, integration, and end-to-end coverage. |
| Monitoring and analytics | Not implemented | No visible subsystem | Add structured logs, metrics, and error tracking. |

## 18. Conclusion

Kharche has a coherent modular-monolith architecture suited to a transaction-sensitive expense application. Its strongest decisions are keeping financial operations server-authoritative, grouping related writes in MongoDB transactions, using integer room accounting, separating SWR server state from Context responsibilities, caching sessions with a database fallback, and isolating browser-side cryptographic operations from server persistence.

The application is already structured for maintainable growth: route boundaries are capability-oriented, domain calculations are separated into reusable services, models include important indexes and constraints, and the UI is decomposed around reusable responsive patterns. The main engineering priorities are not a wholesale architectural change; they are completing the encryption experience, adding tests around high-risk invariants, introducing observability, and replacing process-local controls where horizontal scaling requires shared state.
