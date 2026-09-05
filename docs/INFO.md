# The Pool Hub — Project Guide

This is a beginner-friendly walkthrough of how The Pool Hub actually works today. It was written by inspecting the real code and `package.json` scripts in this repository, not by re-describing what earlier planning documents said should exist. Where something in the code differs from `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, or `docs/API.md`, that's called out explicitly rather than silently smoothed over.

This document is for understanding the system. `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, and `docs/API.md` remain the source of truth for *requirements* — this file explains how those requirements are currently implemented.

---

## 1. The very basics

**The Pool Hub** is a business-management app for Branden, who runs a pool opening/closing service. It lets him track customers, schedule jobs, and record payments — from his iPhone primarily, and from a desktop browser too.

The project is built from several separate pieces that talk to each other over the network:

- **Mobile app** (`apps/mobile`) — the iPhone app Branden actually uses day to day. Built with React Native and Expo. It has no data of its own; every screen asks the backend for data and displays whatever comes back.
- **Web app** (`apps/web`) — a browser-based version of the app for using it from a desktop. Built with React and Vite. It now has its own Dashboard and Schedule too (added in Phase 6D), but designed as a wider, more information-dense business-overview experience rather than a copy of the phone layout (more on that in section 7).
- **Express backend** (`server`) — a Node.js server that both apps talk to. It's the only thing that actually reads or writes the database. Neither the mobile app nor the web app ever connects to the database directly.
- **PostgreSQL database** — where all the real data lives (customers, orders, payments). It's a Postgres database, hosted for you by Supabase rather than running on your own machine.
- **Supabase** — the hosting service that provides both the PostgreSQL database above *and* the authentication system below. Think of Supabase as "the cloud provider this project rents its database and login system from," not as a separate custom-built piece of this project.
- **Supabase Auth** — the part of Supabase specifically responsible for sign-in. It knows who's registered and issues each signed-in user a token proving who they are. Neither the Express backend nor the apps store passwords themselves.
- **Drizzle ORM** — a TypeScript library the Express backend uses to talk to PostgreSQL. Instead of writing raw SQL strings, backend code writes things like `db.select().from(orders).where(...)`, and Drizzle turns that into real SQL. It also gives TypeScript compile-time knowledge of what columns each table has.
- **Shared TypeScript types** (`packages/types`) — a small package of plain type definitions (like `Customer`, `Order`, `Transaction`) that the backend, mobile app, and web app all import, so all three agree on what shape that data has without duplicating the definition three times.

**Why both a frontend and a backend?** The apps (frontend) are what a person looks at and taps on. But if the iPhone app could talk to the database directly, then any inspection of the app's network traffic or code would expose database credentials, and there'd be nothing stopping a modified copy of the app from reading *other customers'* data. The Express backend (server) sits in between: it's the only thing with real database credentials, and every request it receives is checked against "does this authenticated user actually own this data?" before anything is returned. The frontend is deliberately not trusted with that decision.

**What's an API, in this project specifically?** The Express backend exposes a set of URLs like `/api/v1/customers` or `/api/v1/orders/:id`. The apps send HTTP requests to these URLs (e.g., "GET me the customer list," "POST a new order") and get a response back. That collection of URLs *is* the API — it's the whole and only way the apps interact with the database.

**What's JSON here?** Every request body and response body in this API is JSON — plain text formatted as `{ "key": "value" }` structures. When the mobile app creates a customer, it sends a JSON object like `{"name": "John Smith", "phone": "555-1234"}` in the request body; the server responds with a JSON object like `{"customer": {"id": "...", "name": "John Smith", ...}}`. There's no other data format in play (no XML, no binary protocol).

**What does authentication mean here?** It means proving *who is making this request* before the server does anything with it. Concretely: Branden signs in once (via Supabase Auth), gets back a token, and every single request the app makes afterward includes that token. The server verifies the token with Supabase on every request and uses the verified identity to decide what data that request is allowed to see. Nothing about "who you are" is ever taken on the client's word.

---

## 2. Folder structure

```text
the-pool-hub/
├── apps/
│   ├── mobile/     — the Expo/React Native iPhone app
│   └── web/        — the Vite/React browser app
├── server/         — the Express/TypeScript backend
├── packages/
│   └── types/      — shared TypeScript types used by all three apps above
├── docs/           — requirements & architecture docs (source of truth) + this file
├── package.json    — the root of the npm workspace (see below)
└── tsconfig.json   — a base TypeScript config other workspaces extend
```

This repo is an **npm workspace monorepo**: one repository containing four separate npm packages (`server`, `apps/mobile`, `apps/web`, `packages/types`), each with its own `package.json`, but all installed together with a single `npm install` at the root. Root `package.json` also has a few convenience scripts (`dev:server`, `dev:web`, `dev:mobile`) that just forward to the matching workspace.

### `server/` (Express backend)

```text
server/src/
├── index.ts               — the actual entry point; starts listening on a port
├── app.ts                 — builds the Express app: CORS, JSON parsing, mounts routes
├── config/env.ts          — reads and validates process.env (port, CORS origin, Supabase/DB config)
├── auth/supabase-client.ts — creates the Supabase client the server uses to verify tokens
├── middleware/
│   ├── auth.ts             — requireAuth: checks the bearer token on every protected route
│   └── error-handler.ts    — HttpError class + the centralized {error:{code,message}} response shape
├── db/
│   ├── schema.ts           — Drizzle table definitions (profiles, customers, orders, transactions)
│   ├── client.ts           — creates the actual Postgres connection + Drizzle instance
│   ├── order-totals.ts     — getTotalPaidForOrder(): sums an order's transactions
│   └── check-connection.ts — a standalone script to verify the DB is reachable (see section 8)
├── routes/                 — one file per resource; each exports an Express Router
│   ├── health.ts, auth.ts, profile.ts, customers.ts, orders.ts, transactions.ts, dashboard.ts
│   └── index.ts             — mounts all of the above under /api/v1
├── utils/
│   ├── money.ts             — decimal-string ⇄ integer-cents helpers (see section 6)
│   ├── date-ranges.ts       — Monday–Sunday week / calendar-month boundaries in America/Detroit
│   ├── dashboard-calculations.ts — appointment selection + revenue-summing logic for the dashboard
│   └── validation.ts        — small shared input-validation helpers (isUuid, etc.)
└── types/express.d.ts       — adds a `userId` field to Express's Request type
```

Each `routes/*.ts` file handles one resource (e.g., `orders.ts` has every `/orders...` endpoint) and follows the same shape: parse/validate the request, run a Drizzle query scoped to the authenticated user, shape the response, hand errors to `next(error)` so the central error handler formats them consistently.

### `apps/mobile/` (iPhone app)

```text
apps/mobile/src/
├── navigation/RootNavigator.tsx — defines every screen and how they connect (see section 7)
├── auth/AuthContext.tsx         — wraps the app, tracks the current Supabase session
├── api/                         — one file per resource; thin wrappers around apiClient
│   ├── dashboard.ts, orders.ts, customers.ts, transactions.ts, profile.ts
├── lib/
│   ├── api-client.ts            — attaches the auth token to every request, throws ApiError
│   ├── supabase.ts              — creates the Supabase client (session stored in the iOS Keychain)
│   ├── secure-store-adapter.ts  — makes Supabase's session storage work with iOS's Keychain size limits
│   ├── format.ts                — currency/date/time display helpers used across screens
│   └── business-week.ts         — Monday–Sunday week math for the Schedule screen (see section 6; web has an identical copy at apps/web/src/lib/business-week.ts)
└── screens/                     — one file per screen (DashboardScreen, ScheduleScreen, OrderDetailScreen, ...)
```

`apps/mobile/App.tsx` (repo root of that app, not under `src/`) is the actual top-level component: it wraps everything in `AuthProvider` and shows either `LoginScreen` or `RootNavigator` depending on whether there's a session.

### `apps/web/` (browser app)

```text
apps/web/src/
├── App.tsx          — shows LoginScreen or CustomerApp depending on auth state
├── CustomerApp.tsx  — the web app's own hand-rolled navigation (see note below)
├── auth/            — AuthContext.tsx / auth-context.ts / useAuth.ts — same idea as mobile's AuthContext
├── api/             — customers.ts, orders.ts, transactions.ts, dashboard.ts, profile.ts — same pattern as mobile's api/ folder
├── components/
│   └── AppHeader.tsx — shared top nav bar used by Dashboard and Schedule only (see section 7)
├── lib/             — api-client.ts, supabase.ts, format.ts, business-week.ts — same pattern as mobile's lib/ folder
└── screens/         — CustomerListScreen, CustomerDetailScreen, OrderListScreen, OrderDetailScreen,
                        DashboardScreen, ScheduleScreen, etc.
```

The web app does **not** use a router library (no React Router). `CustomerApp.tsx` is a single component holding a `view` state variable (a discriminated union like `{screen: "detail", customerId: string}`) and a `setView` function; each screen receives callback props like `onSelectCustomer` instead of navigating via URLs. This is a deliberate, simple choice already established in the codebase, not an oversight.

### `packages/types/`

Just one file, `src/index.ts`, exporting plain interfaces (`Customer`, `Order`, `Transaction`, `Dashboard`, etc.) and unions (`OrderStatus`, `OrderType`, `PaymentMethod`). There's no build step involved for consumers: every consumer imports these using `import type`, which TypeScript deletes entirely at compile time, so `apps/mobile` and `apps/web` don't need this package "built" first for normal development — it works as plain source.

**Discrepancy worth knowing about:** `docs/ARCHITECTURE.md` lists `Profile` as one of the example shared types, but no `Profile` type actually exists in `packages/types`. The `/profile` endpoint's response shape is currently defined locally and separately in `server/src/routes/profile.ts` and (differently) in `apps/mobile/src/api/profile.ts`. It works, but it's the one resource that doesn't follow the shared-types pattern everything else uses.

---

## 3. Request flow, step by step

Every one of these follows the same skeleton:

```text
Screen component
  → api/*.ts client function
    → apiClient (attaches the Supabase access token)
      → HTTP request to the Express server
        → Express route
          → requireAuth middleware (verifies the token with Supabase)
            → Drizzle query, scoped to the authenticated user
              → JSON response
        ← rendered by the screen
```

### Login

1. `LoginScreen` calls `signIn(email, password)` from `AuthContext`.
2. That calls `supabase.auth.signInWithPassword(...)` — this goes **directly to Supabase**, not through the Express server at all. Supabase itself checks the password and, on success, returns a session (an access token + refresh token).
3. The Supabase client library (already wired up in `lib/supabase.ts`) stores that session — in the iOS Keychain on mobile (via `secure-store-adapter.ts`), in `localStorage` on web.
4. `AuthContext`'s `onAuthStateChange` listener fires, `session` state updates, and the app switches from `LoginScreen` to `RootNavigator` (mobile) or `CustomerApp` (web).

No Express route is involved in login itself — Supabase Auth handles the credential check entirely.

### Loading customers

1. `CustomerListScreen` calls `listCustomers(search)` from `api/customers.ts`.
2. That calls `apiClient.get("/customers?search=...")`.
3. `apiClient` (in `lib/api-client.ts`) first asks Supabase for the current session's access token, then sends `GET {API_BASE_URL}/customers` with `Authorization: Bearer <token>`.
4. Express receives it at `customersRouter.get("/customers", requireAuth, ...)`. `requireAuth` extracts the bearer token and calls `supabase.auth.getUser(token)` — this is the server asking Supabase "is this token real, and whose is it?" Supabase's answer sets `req.userId`.
5. The route handler runs `db.select().from(customers).where(eq(customers.userId, req.userId))` (plus the search filter and `archivedAt IS NULL`) — Drizzle turns that into a real SQL query against Postgres.
6. Postgres returns matching rows; the route shapes them into the `Customer` JSON shape and responds.
7. The screen sets `customers` state from the response and renders the list.

**This is where ownership/security is enforced**: step 4 (nobody gets past `requireAuth` without a token Supabase itself vouches for) and step 5 (the query is *always* filtered to `customers.userId = <the id Supabase just verified>` — never a customer ID or user ID supplied by the client).

### Creating an order

Same shape as above, but `POST`: `OrderFormScreen` → `createOrder(input)` → `apiClient.post("/orders", body)` → `ordersRouter.post("/orders", requireAuth, ...)`. The route re-verifies that `input.customerId` belongs to the authenticated user (and isn't archived) *before* inserting — it never trusts that the client only shows customers the user is allowed to use. On success it inserts with `status: "scheduled"` (the default) and returns the created order.

### Adding a payment

`PaymentFormScreen` → `createTransaction(input)` → `POST /transactions`. Ownership here is one hop further: a transaction belongs to an order, which belongs to a customer, which belongs to a user. The route joins `transactions → orders → customers` and checks `customers.userId = <authenticated user>` — there's no `user_id` column on `orders` or `transactions` directly, so ownership always flows through that join chain. The route also checks the payment amount doesn't exceed the order's remaining balance before inserting (see section 6).

### Loading the dashboard

`DashboardScreen` → `getDashboard()` (and, separately/independently, `getProfile()` for the greeting name) → `GET /dashboard`. Inside the route (`server/src/routes/dashboard.ts`), a single handler:
- computes this week's and this month's date boundaries (`utils/date-ranges.ts`, in `America/Detroit` — see section 6),
- runs a few Drizzle queries (all still filtered to the authenticated user via the same join chain) for scheduled orders, orders in the revenue window, and transactions in the revenue window,
- picks the earliest scheduled order as `nextAppointment` and the next 5 as `upcomingAppointments` (`utils/dashboard-calculations.ts`),
- sums made/expected revenue for the week and month,
- and — only for `nextAppointment` — adds `amountRemaining` and a one-line `customerAddress`, so the mobile screen's primary card needs exactly this one request and nothing more.

### Loading the weekly schedule

`ScheduleScreen` (on both mobile and web — each has its own copy) computes the selected week's Monday–Sunday boundary itself, in the app (`lib/business-week.ts` — using the same `America/Detroit` logic as the server's `date-ranges.ts`, kept in sync by hand across all three implementations since there's no shared runtime code between the server, the Expo app, and the Vite app), then calls the *existing* `GET /orders` endpoint with `scheduledFrom`/`scheduledTo` set to that week and `limit=100`. There's no separate "schedule" endpoint or database table — the schedule is just orders, grouped client-side into the 7 days of the week by comparing each order's `scheduledDate` against the week's day boundaries.

---

## 4. Supabase, in detail

Supabase provides two *separate* services this project uses. It's easy to conflate them, so:

### Supabase Auth

- Handles sign-in (`supabase.auth.signInWithPassword`) and sign-out, entirely on Supabase's own servers.
- On success, the client gets a **session**: a short-lived **JWT** (JSON Web Token — a signed token that encodes who the user is and when it expires) plus a longer-lived refresh token used to silently get new JWTs without asking the user to log in again.
- Both apps receive this session because *they* are the ones the user is directly interacting with — the session has to live somewhere the app can use it on every subsequent request.
- The Express backend independently verifies every token it receives (`supabase.auth.getUser(token)` in `middleware/auth.ts`) rather than trusting it — a JWT can't be forged without Supabase's private signing key, but the server still confirms with Supabase that the token is real and not expired/revoked before trusting the user ID inside it.
- The client **never** supplies a trusted user ID directly (e.g., there's no `?userId=...` query param the server believes). The only user identity the server ever acts on is the one Supabase just verified from the token. This is true across every route in this codebase — check `getAuthenticatedUserId(req)` at the top of nearly every handler.

### Supabase PostgreSQL

This is the actual application database — an ordinary PostgreSQL database that happens to be hosted and managed by Supabase rather than running on your own machine. Four tables currently exist:

- `profiles` — one row per Supabase Auth user (name, company name)
- `customers` — belongs to a profile (`user_id`)
- `orders` — belongs to a customer (`customer_id`)
- `transactions` — belongs to an order (`order_id`)

**Ownership chain**: `authenticated user → customer.user_id → order.customer_id → transaction.order_id`. This matters because `orders` and `transactions` have *no* `user_id` column of their own — the only way to know an order or transaction belongs to the signed-in user is to follow this chain back to a `customers.user_id` that matches. Every query in the backend that touches orders or transactions includes a join back to `customers` for exactly this reason. This isn't just a performance detail — it's the entire ownership/security model for those two tables.

### When Supabase pauses your project

Supabase's free tier automatically **pauses a project after a period of inactivity**. When that happens, the database stops accepting connections and any Supabase API calls (including Auth) start failing — this looks like the whole app being broken, even though nothing in the code changed. If local development suddenly stops working (login fails, or the server can't reach the database), check the Supabase dashboard first: the project must be resumed/unpaused there before anything database- or auth-dependent will work again. No amount of restarting the local server fixes this — it requires action in the Supabase dashboard itself.

---

## 5. The database model

```text
profiles (1) ──< customers (many) ──< orders (many) ──< transactions (many)
```

- **profiles** — `id` (matches the Supabase Auth user id), `name`, `company_name`.
- **customers** — belongs to a profile. Has contact info, address, pool size, notes, and `archived_at` (nullable). **Customers are archived, never deleted** — archiving just sets `archived_at` to now; the customer, and all of their orders/transactions, remain fully intact and viewable. Archiving only blocks *new* orders/transactions from being created for that customer.
- **orders** — belongs to a customer. Has `order_type` (`opening`/`closing`), `scheduled_date`, `completed_date` (nullable, set when completed), `price`, `status` (`scheduled`/`completed`/`cancelled`, defaults to `scheduled`), `notes`. **Orders are never deleted.** Status changes only go through dedicated endpoints (`/orders/:id/complete`, `/orders/:id/cancel`) — you can't complete a cancelled order or cancel a completed one, and both are safe to call twice (idempotent).
- **transactions** — belongs to an order. Has `amount`, `transaction_date`, `payment_method` (`cash`/`check`/`card`/`other`), `notes`. **Transactions are never deleted** — they're treated as permanent financial records. One order can have any number of transactions (this is what allows deposits + a final payment on the same job).

**Why totals are calculated instead of stored**: there's no `total_paid` or `amount_remaining` column on `orders`. Instead, whenever that information is needed, the server sums the order's actual `transactions.amount` rows on the fly (`db/order-totals.ts`). This guarantees the number is always correct relative to the real transaction history — there's no separate "running total" that could ever drift out of sync with the underlying payments.

**Worked example**: Customer "Jane Doe" has one order — a $500 pool opening. Two payments come in: a $200 deposit, then a $300 final payment.
- `orders` has one row: price = `500.00`, status = `scheduled` (or `completed`, once done).
- `transactions` has two rows tied to that order: `200.00` and `300.00`.
- Ask the API for that order's detail and it reports `totalPaid: "500.00"`, `amountRemaining: "0.00"` — both computed at request time by summing the two transaction rows, not read from a stored column.

---

## 6. Financial handling

**Why not floating point?** Floating-point numbers (JavaScript's regular `number` type) can't represent every decimal value exactly — `0.1 + 0.2` famously doesn't equal `0.3` in floating point. For a business tracking real money, small rounding errors like that are unacceptable, so this project never uses float arithmetic to make a financial decision (like "has this order been paid off?").

Instead, `server/src/utils/money.ts` provides:
- `toCents("350.00")` → `35000` (a plain integer)
- `centsToDecimalString(35000)` → `"350.00"`
- All actual math (adding payments, subtracting to find a remaining balance) happens on these plain integers, which is always exact — then the result is converted back to a decimal string only for display/storage.

Values that flow through the API are always **decimal strings** like `"350.00"`, never JavaScript numbers, specifically so nothing downstream is tempted to do float math on them.

- **Order price** — stored on the order, set when it's created.
- **Total paid** — sum of that order's transaction amounts (calculated, not stored).
- **Amount remaining** — `max(price − totalPaid, 0)`, calculated the same way. `computeAmountRemaining()` in `money.ts` is the one place this exact formula lives.
- **Made revenue** (dashboard) — sum of transaction amounts recorded within a period. This is literally "money that arrived."
- **Expected revenue** (dashboard) — sum of the *full price* of every scheduled-or-completed order whose scheduled date falls within a period. This is **not** reduced by payments already received — a $500 order with a $200 deposit still counts as $500 of expected revenue and $200 of made revenue, at the same time. Cancelled orders never contribute to expected revenue.

**Monday–Sunday weeks and `America/Detroit`**: the dashboard's "this week"/"this month" and both Schedule screens' week views (mobile and web) are all defined in the `America/Detroit` timezone specifically (not the server's own timezone, and not "whatever timezone the device happens to be in") — this is currently a hardcoded constant (`server/src/utils/date-ranges.ts`, mirrored by hand in `apps/mobile/src/lib/business-week.ts` and `apps/web/src/lib/business-week.ts`), appropriate for this single-business app, and intended to become per-business data if the app ever needs to support businesses in different timezones. The reason this needed real care: Postgres timestamps are stored in UTC, and naively using UTC calendar days would misclassify anything that happens in the last few hours of an Eastern-time day (e.g., a payment entered at 9pm Eastern) into the *next* UTC day/week/month. Both implementations use `Intl.DateTimeFormat` with an explicit `timeZone` to compute the correct offset for each specific boundary, so DST transitions (EST ↔ EDT) are handled correctly automatically rather than needing a hardcoded ±4/±5 hour offset.

---

## 7. Navigation (mobile and web)

### Mobile

**Dashboard is the authenticated landing screen** — it's what Branden sees immediately after logging in (`RootNavigator`'s `initialRouteName` is `"Dashboard"`).

```text
Dashboard
 ├─→ Schedule → Order Detail
 ├─→ Customers → Customer Detail → New Order (→ Order Detail once created)
 └─→ (header) Orders  [the original flat order list — still fully intact]

Schedule
 ├─→ Order Detail
 └─→ (header) Orders, + New Job (→ Customers, same flow as above)

Order Detail
 └─→ Add/Edit Payment
```

The classic **Orders** screen (`OrderListScreen`) — a flat, filterable list of every order — still exists and is still fully reachable; it was never removed. Before Phase 6, Dashboard's header linked directly to it; now that link points at Schedule instead, and Orders is reachable from Schedule's own header, plus from Customer Detail's order list either way.

All navigation is done with React Navigation's native-stack navigator and typed routes (`RootStackParamList` in `RootNavigator.tsx`) — there is no separate router library.

### Web

Web gained its own Dashboard and Schedule in Phase 6D, deliberately designed as a wider, higher-density "business control panel" rather than a copy of the phone layout — two-column revenue/appointment cards and a 7-column Monday–Sunday schedule grid, taking advantage of the extra screen space instead of stacking everything vertically.

```text
Dashboard
 ├─→ Schedule → Order Detail
 ├─→ Customers → Customer Detail → New Order (→ Order Detail once created)
 └─→ (header) Orders  [the original flat order list — still fully intact]

Schedule
 ├─→ Order Detail
 └─→ (header) Orders, + Schedule Job (→ Customers, same customer-first flow as above)
```

Web still has no router library — `CustomerApp.tsx`'s hand-rolled `view` state machine (see section 2) was simply extended with two more `view` variants (`"dashboard"`, `"schedule"`), which is now the initial state instead of `"list"`. A small shared `AppHeader` component (`apps/web/src/components/AppHeader.tsx`) gives Dashboard and Schedule a persistent top nav bar (Dashboard/Schedule/Customers/Orders/Log Out); the older screens (Customers, Orders, Customer Detail, etc.) keep their own existing per-screen headers rather than adopting it, so this wasn't a navigation rewrite — just two new destinations wired into the existing pattern, plus a small "← Dashboard" link added to the Customers screen (which used to be the root screen and had nowhere to link back to).

---

## 8. Local development setup

*(Every command below is copied from an actual script in a `package.json` in this repo — nothing here is invented.)*

### Install dependencies

From the **repo root**:

```bash
npm install
```

Because this is an npm workspace, one install at the root sets up `server`, `apps/mobile`, `apps/web`, and `packages/types` together.

### Start the backend

```bash
cd server
npm run dev
```

This runs `tsx watch --env-file-if-exists=.env src/index.ts` — it starts the Express app, auto-reloading on file changes, and loads environment variables from `server/.env` if that file exists.

- **Port**: `3000` by default (see `server/src/config/env.ts` — it falls back to 3000 if `PORT` isn't set or isn't a valid positive integer).
- **Environment variables it needs**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` for anything auth- or database-related to work. Notably, the server is designed to **start successfully even with none of these set** — `/api/v1/health` will still respond — the Supabase/DB clients are only constructed the first time a route actually needs them, so a missing `.env` breaks just the routes that need it, not the whole process.

### Start the web frontend

```bash
cd apps/web
npm run dev
```

This runs Vite's dev server. Vite's default port is `5173`, so you'd view it at **http://localhost:5173** — this also matches the server's default `CORS_ORIGIN` fallback, so the two work together out of the box with no `.env` changes needed for local development.

### Start the mobile frontend

```bash
cd apps/mobile
npm run start
```

This runs `expo start`, which starts the Expo dev server and shows a QR code / terminal menu (press `i` for the iOS Simulator, `a` for Android, or scan the QR code with a physical device).

This project currently uses **Expo SDK 57**. The version of Expo Go available on the App Store does not necessarily support whatever SDK version this project is pinned to — if `npm run start` reports a version mismatch when connecting from Expo Go, you'll need a **development build** (a custom-compiled build of this specific app, made with `expo run:ios` or EAS Build) instead of the generic App Store Expo Go app. This is a normal Expo constraint, not a bug — and per current project instructions, the Expo version itself should not be changed to work around it.

### Database

There is **no local Postgres process to start**. The database is entirely hosted by Supabase — there's nothing running on your machine to "start" for the database itself. To use it locally:

1. The Supabase project must be **active/unpaused** (see section 4).
2. `server/.env` must have a valid `DATABASE_URL` pointing at that Supabase project's Postgres instance.
3. When the server runs, it connects to that Postgres instance over the network — same as it would in production, just from your machine instead of a deployed server.

**To verify the connection is actually working**, an existing script does exactly this:

```bash
cd server
npm run db:check
```

This runs `server/src/db/check-connection.ts`, which tries a trivial read against each of the four tables and prints `OK`/`FAIL` per table — a fast way to confirm both that `DATABASE_URL` is correct and that the Supabase project isn't paused, without needing to open any app.

---

## 9. Daily startup — the simple version

**Before anything else**: make sure the Supabase project is not paused (check the Supabase dashboard).

Then, three terminals:

```text
Terminal 1 (backend):
  cd server
  npm run dev

Terminal 2 (web, optional — only if you're working on the web app):
  cd apps/web
  npm run dev

Terminal 3 (mobile, optional — only if you're working on the mobile app):
  cd apps/mobile
  npm run start
```

A few things worth understanding, not just doing:

- **The mobile/web apps need to actually reach the backend.** Both read the backend's URL from an environment variable (`EXPO_PUBLIC_API_BASE_URL` for mobile, `VITE_API_BASE_URL` for web) rather than hardcoding it, specifically so this can be pointed at different places.
- **"localhost" means something different on a phone than on your Mac.** If `EXPO_PUBLIC_API_BASE_URL` is set to `http://localhost:3000/api/v1` and you run the app in the **iOS Simulator**, that works fine — the simulator shares your Mac's network stack, so "localhost" really does mean "this Mac." But on a **physical iPhone**, "localhost" means "the iPhone itself," which obviously has no Express server running on it — the request will simply fail to connect. A physical device needs your Mac's actual LAN IP address (e.g., `http://192.168.1.20:3000/api/v1`) instead of `localhost`.
- This document isn't going to change that value for you — if you need it changed, edit `apps/mobile/.env` yourself with your Mac's current LAN IP.

---

## 10. Environment variables

None of the actual values are reproduced here — only what each one is *for*. See each workspace's `.env.example` file for the exact variable names and a placeholder format.

### Server (`server/.env`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Which Supabase project to talk to, for verifying auth tokens. |
| `SUPABASE_PUBLISHABLE_KEY` | The public API key for that Supabase project (safe to also use client-side — see below). |
| `DATABASE_URL` | The Postgres connection string Drizzle uses to reach the actual database. |
| `PORT` | What port Express listens on. Defaults to `3000` if unset. |
| `NODE_ENV` | `development`/`production`/`test` — currently affects only whether internal error details are included in a 500 response (hidden in production). |
| `CORS_ORIGIN` | Which frontend origin(s) are allowed to call this API from a browser. Defaults to `http://localhost:5173` (Vite's default) if unset. |

### Mobile (`apps/mobile/.env`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Same Supabase project, used directly by the app for sign-in. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The same publishable key as above. |
| `EXPO_PUBLIC_API_BASE_URL` | Where the Express backend is reachable from the app (see the localhost note in section 9). |

### Web (`apps/web/.env`)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Same idea as mobile's. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same idea as mobile's. |
| `VITE_API_BASE_URL` | Same idea as mobile's `EXPO_PUBLIC_API_BASE_URL`. |

**"Publishable" vs. a true secret**: Supabase's publishable key is deliberately designed to be safe inside client-side code that any user could inspect (it's the same key used by mobile, web, *and* the server here) — it identifies which Supabase project to talk to, but by itself it can't bypass Supabase's Row Level Security or read data it shouldn't. It's fundamentally different from Supabase's **service-role key**, which bypasses all security rules and must never appear in mobile, web, or any code a user could ever inspect — this project doesn't use a service-role key anywhere in application code.

**Rules that apply everywhere in this project:**
- `.env` files are never committed to git (`.gitignore` covers them; only `.env.example` files are committed, with placeholder values).
- Never put a service-role key, database password, or any true secret in mobile or web code.
- Never paste a real value from any `.env` file into documentation, chat, or a commit — including this file.

---

## 11. How a code change flows through the system

Say you want to add a new field to `Order` — for example, a `technicianNotes` field.

1. **Database schema** (`server/src/db/schema.ts`) — add the column to the Drizzle table definition. This step requires an actual database migration (a real `ALTER TABLE` run against Supabase Postgres) — Drizzle's schema file describes the table, it doesn't change it by itself.
2. **Server query/route** (`server/src/routes/orders.ts`) — accept the new field on create/update, include it when selecting, and add it to the function that shapes the JSON response (`toOrderResponse`).
3. **Shared types** (`packages/types/src/index.ts`) — add `technicianNotes` to the `Order` interface (and `CreateOrderInput`/`UpdateOrderInput` if it should be settable) so every consumer knows about it at compile time.
4. **Mobile/web API client** (`apps/mobile/src/api/orders.ts`, `apps/web/src/api/orders.ts`) — usually nothing to change here at all, since these are thin pass-through wrappers already typed against the shared `Order` type.
5. **Screen** (`OrderDetailScreen.tsx`, `OrderFormScreen.tsx`, on both mobile and web) — actually display/edit the new field.

**When is a migration required?** Any time step 1 changes — adding, removing, or changing the type of an actual database column. It is **not** required for a change confined to steps 2–5 alone (e.g., changing how an existing field is *formatted* for display, or adding a client-side-only computed value that isn't stored).

---

## 12. Testing and validation

**What currently exists**, confirmed against the real scripts:

- **Backend unit tests (Vitest)** — `server` is the only workspace with a test framework. Tests cover the pure, non-database logic: week/month boundary math (`date-ranges.test.ts`), dashboard appointment-selection and revenue calculations (`dashboard-calculations.test.ts`), and the remaining-balance calculation (`money.test.ts`). Nothing that requires a live database connection is covered by this automated suite — those parts have instead been checked by hand against the real (test) Supabase account during development, then cleaned up.

  ```bash
  cd server
  npm run test
  ```

- **Typecheck** (every workspace has this):

  ```bash
  npm run typecheck        # from repo root — runs it in every workspace
  # or, for just one workspace:
  npm run typecheck --workspace server
  npm run typecheck --workspace apps/mobile
  npm run typecheck --workspace apps/web
  ```

- **Lint** (every workspace has this):

  ```bash
  npm run lint              # from repo root — runs it in every workspace
  npm run lint --workspace server
  ```

- **Mobile bundle validation** — there's no dedicated `package.json` script for this yet, but Expo's own CLI can validate that the whole JS bundle actually compiles (catching real bundler-resolution errors that `tsc` alone wouldn't):

  ```bash
  cd apps/mobile
  npx expo export --platform ios --output-dir /tmp/some-output-dir
  ```

- **Web build** (also serves as a stricter typecheck, since `tsc -b` runs before the Vite build):

  ```bash
  cd apps/web
  npm run build
  ```

There is currently **no test script at the repo root** and **no test framework at all for `apps/mobile` or `apps/web`** — don't assume `npm test` works from the root; it doesn't exist.

---

## 13. Git workflow

- `git status` — see what's changed/untracked.
- `git diff` — see the actual line-by-line changes before committing.
- `git commit` — record a snapshot. Keep commits small and focused on one logical change.
- `git push` — send commits to the remote (GitHub).

**Never stage a `.env` file or anything containing a real secret.** They're already covered by `.gitignore`, but always double-check `git status`/`git diff` before committing if something looks unexpected — an innocuous-looking filename can still contain a real credential.

**Claude should not commit anything unless you explicitly ask it to**, in this conversation, for this specific set of changes. Approving a commit once doesn't carry forward to future changes.

---

## 14. Glossary

- **Frontend** — the part of an app a person directly sees and interacts with (here: the mobile and web apps).
- **Backend** — the server that the frontend talks to, which does the real work of reading/writing data (here: the Express server).
- **API** — Application Programming Interface; the set of URLs a backend exposes for other programs to call.
- **Endpoint** — one specific API URL + HTTP method, e.g. `POST /api/v1/orders`.
- **Route** — the backend code that handles one endpoint.
- **HTTP** — the protocol web/app requests are sent over (`GET`, `POST`, `PATCH`, etc., with a status code like `200` or `404` in the response).
- **JSON** — the text format (`{"key": "value"}`) every request/response body in this project uses.
- **JWT** — JSON Web Token; a signed token (used here by Supabase Auth) that encodes who a user is, which the server can verify without a database lookup for the signature itself.
- **Session** — the pair of tokens (access + refresh) a signed-in user holds, letting them stay "logged in" without re-entering a password constantly.
- **Authentication** — proving *who* is making a request.
- **Authorization** — deciding *what* an already-identified user is allowed to do or see (in this project, "only your own data").
- **Database** — where persistent data actually lives; here, PostgreSQL.
- **PostgreSQL** — the specific relational database system this project uses.
- **Supabase** — the hosting platform providing this project's PostgreSQL database and its authentication system.
- **ORM** — Object-Relational Mapper; a library that lets code query a database using the host language (TypeScript) instead of raw SQL strings.
- **Drizzle** — the specific ORM this project uses.
- **React** — the UI library both the web app and (via React Native) the mobile app are built with.
- **React Native** — a framework for building real mobile apps using React's component model.
- **Expo** — the toolchain this project uses on top of React Native (dev server, native module management, `expo start`, etc.).
- **Vite** — the build tool/dev server the web app uses.
- **TypeScript** — JavaScript with static types, used throughout this entire project.
- **Environment variable** — a configuration value (like a URL or API key) supplied outside the code itself, so the same code can run against different setups (local vs. production) without editing source files.
- **localhost** — "this same machine." Means something different depending on which device is running the code (see section 9).
- **Port** — a number identifying which running process on a machine a network connection should reach (e.g., the Express server listens on port `3000`).
- **CORS** — Cross-Origin Resource Sharing; the browser security rule that blocks a web page from calling an API on a different origin unless that API explicitly allows it (`CORS_ORIGIN` on the server controls this).
