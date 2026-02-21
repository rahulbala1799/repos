# Restaurant POS System — Technical Specification

**Version**: 1.0
**Date**: 2026-02-21
**Goal**: Build the fastest-syncing, most reliable restaurant POS system on the market

---

## 1. Vision & Differentiators

The market is crowded with legacy POS systems (Toast, Square, Lightspeed) that are either slow to sync, require proprietary hardware, or are expensive. We win by being:

| What | How |
|------|-----|
| **Fastest order sync** | Supabase Realtime (WebSocket) + Optimistic UI = sub-100ms perceived latency |
| **Never loses an order** | Offline-first with local queue, intelligent sync on reconnect |
| **Works on any hardware** | React Native (iOS + Android), any ESC/POS WiFi printer |
| **Smart routing** | Orders auto-route to correct KDS zone and printer by category |
| **Multi-tenant SaaS** | One codebase, each restaurant is fully isolated |

---

## 2. Tech Stack

### Frontend
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **React Native** (Expo bare workflow) | iOS + Android, native modules needed for TCP |
| State | **Zustand** | Minimal boilerplate, fast, no provider hell |
| Navigation | **React Navigation v6** | Industry standard, mature |
| Local DB | **WatermelonDB** | Offline-first, lazy loading, SQLite under the hood |
| Network sync | **Custom Supabase sync layer** | Built on WatermelonDB + Supabase |
| UI | **Custom components** | No heavy libraries — performance is a feature |
| Connectivity | **@react-native-community/netinfo** | Detect online/offline transitions |

### Backend
| Layer | Choice | Why |
|-------|--------|-----|
| Database | **Supabase (PostgreSQL)** | Row-level security, mature ecosystem |
| Auth | **Supabase Auth** | JWT, role-based, multi-tenant ready |
| Realtime | **Supabase Realtime** | WebSocket over Postgres logical replication |
| Edge Functions | **Supabase Edge Functions** | Deno-based, for webhooks, print jobs, complex mutations |
| Storage | **Supabase Storage** | Menu item images |
| Secrets | **Supabase Vault** | API keys, printer credentials |

### Printer
| Layer | Choice | Why |
|-------|--------|-----|
| Protocol | **ESC/POS over TCP port 9100** | Universal — works with Star, Epson, Bixolon, HPRT, any WiFi thermal printer |
| RN Library | **react-native-tcp-socket** | Direct TCP socket, no vendor SDK lock-in |
| Encoder | **escpos-buffer (custom JS)** | Pure JS ESC/POS encoder, no native deps |
| Connectivity | WiFi (same LAN as tablet) | Sub-10ms print trigger once connected |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RESTAURANT LAN                           │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  POS Tablet  │   │  POS Tablet  │   │  Manager Tablet  │   │
│  │  (order      │   │  (order      │   │  (dashboard,     │   │
│  │   taking)    │   │   taking)    │   │   reports)       │   │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘   │
│         │                  │                     │             │
│         └──────────────────┼─────────────────────┘            │
│                            │ WebSocket (Supabase Realtime)     │
│                            │                                   │
│  ┌──────────────┐   ┌──────▼───────┐   ┌──────────────────┐   │
│  │ KDS Screen   │   │   SUPABASE   │   │  KDS Screen      │   │
│  │ (Bar/Drinks) │◄──┤   REALTIME   ├──►│  (Hot Kitchen)   │   │
│  └──────────────┘   └──────┬───────┘   └──────────────────┘   │
│                            │                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              WiFi Thermal Printers (ESC/POS TCP:9100)    │  │
│  │   [Bar Printer]   [Kitchen Printer]   [Receipt Printer]  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  SUPABASE CLOUD │
                    │  - PostgreSQL   │
                    │  - Auth (JWT)   │
                    │  - Storage      │
                    │  - Edge Fns     │
                    └─────────────────┘
```

---

## 4. Database Schema

### Tenant & Config

```sql
-- Each row is one restaurant (tenant)
create table restaurants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,          -- used in URL/config
  timezone     text default 'UTC',
  currency     text default 'EUR',
  created_at   timestamptz default now()
);

create table restaurant_settings (
  restaurant_id  uuid primary key references restaurants(id),
  receipt_header text,
  receipt_footer text,
  tax_rate       numeric(5,2) default 0,
  service_charge numeric(5,2) default 0,
  allow_split_bill boolean default true,
  updated_at     timestamptz default now()
);
```

### Staff & Auth

```sql
-- Extends auth.users
create table staff (
  id             uuid primary key references auth.users(id),
  restaurant_id  uuid not null references restaurants(id),
  display_name   text not null,
  role           text not null check (role in ('owner','manager','server','kitchen','cashier')),
  pin            text,                         -- 4-digit PIN for quick switch
  active         boolean default true,
  created_at     timestamptz default now()
);

create table shifts (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  staff_id       uuid not null references staff(id),
  started_at     timestamptz default now(),
  ended_at       timestamptz,
  opening_float  numeric(10,2),
  closing_float  numeric(10,2)
);
```

### Venue Layout

```sql
create table sections (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,               -- "Indoor", "Outdoor", "Bar"
  sort_order     int default 0,
  active         boolean default true
);

create table tables (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  section_id     uuid references sections(id),
  name           text not null,               -- "T1", "Table 12", "Bar 3"
  capacity       int,
  status         text default 'available' check (status in ('available','occupied','reserved','cleaning')),
  current_order_id uuid                       -- denormalized for speed
);
```

### Menu

```sql
create table menu_categories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,               -- "Starters", "Mains", "Drinks"
  color          text,                        -- for UI
  sort_order     int default 0,
  active         boolean default true
);

create table menu_items (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  category_id    uuid not null references menu_categories(id),
  name           text not null,
  description    text,
  price          numeric(10,2) not null,
  image_url      text,
  sku            text,
  tax_rate       numeric(5,2),                -- override restaurant default if set
  available      boolean default true,
  sort_order     int default 0
);

create table modifier_groups (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,               -- "Choose sauce", "Extras"
  required       boolean default false,
  min_select     int default 0,
  max_select     int default 1,
  sort_order     int default 0
);

create table modifiers (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references modifier_groups(id),
  name           text not null,
  price_delta    numeric(10,2) default 0,     -- 0 = free, >0 = extra charge
  available      boolean default true,
  sort_order     int default 0
);

create table menu_item_modifier_groups (
  item_id        uuid references menu_items(id),
  group_id       uuid references modifier_groups(id),
  sort_order     int default 0,
  primary key (item_id, group_id)
);
```

### Orders — The Hot Path

```sql
-- Order state machine:
-- OPEN -> SUBMITTED -> ACKNOWLEDGED -> PREPARING -> READY -> SERVED -> CLOSED
--                                                                    -> VOID

create table orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  table_id       uuid references tables(id),
  section_id     uuid references sections(id),
  staff_id       uuid references staff(id),   -- server who created
  status         text not null default 'open' check (
                   status in ('open','submitted','acknowledged','preparing','ready','served','closed','void')
                 ),
  covers         int default 1,               -- number of guests
  notes          text,
  total          numeric(10,2) default 0,     -- denormalized for speed
  submitted_at   timestamptz,
  closed_at      timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id),
  restaurant_id  uuid not null references restaurants(id),  -- for RLS filtering
  menu_item_id   uuid not null references menu_items(id),
  name           text not null,               -- snapshot at time of order
  price          numeric(10,2) not null,      -- snapshot
  quantity       int not null default 1,
  notes          text,
  status         text not null default 'pending' check (
                   status in ('pending','sent','acknowledged','preparing','ready','served','void')
                 ),
  seat           int,                         -- for seat-based splitting
  sent_at        timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table order_item_modifiers (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references order_items(id),
  modifier_id    uuid references modifiers(id),
  name           text not null,               -- snapshot
  price_delta    numeric(10,2) default 0
);
```

### Payments

```sql
create table payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id),
  restaurant_id  uuid not null references restaurants(id),
  method         text not null check (method in ('cash','card','split','voucher','complimentary')),
  amount         numeric(10,2) not null,
  tip_amount     numeric(10,2) default 0,
  reference      text,                        -- card terminal ref, voucher code
  staff_id       uuid references staff(id),
  created_at     timestamptz default now()
);
```

### KDS & Printer Routing

```sql
create table kds_stations (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,               -- "Hot Kitchen", "Cold Kitchen", "Bar"
  display_order  int default 0,
  active         boolean default true
);

-- Which menu categories route to which KDS station
create table kds_station_categories (
  station_id     uuid references kds_stations(id),
  category_id    uuid references menu_categories(id),
  primary key (station_id, category_id)
);

create table printers (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,               -- "Bar Printer", "Kitchen Printer", "Receipt"
  ip_address     text not null,               -- WiFi IP on LAN
  port           int default 9100,            -- ESC/POS standard port
  paper_width    int default 80,              -- 58 or 80mm
  type           text default 'kitchen' check (type in ('kitchen','receipt','label')),
  active         boolean default true
);

-- Which menu categories print to which printer
create table printer_routing (
  printer_id     uuid references printers(id),
  category_id    uuid references menu_categories(id),
  primary key (printer_id, category_id)
);

-- Audit trail of print jobs (for reprint, debugging)
create table print_jobs (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  printer_id     uuid references printers(id),
  order_id       uuid references orders(id),
  type           text check (type in ('kitchen_docket','receipt','void','reprint')),
  payload        bytea,                       -- raw ESC/POS bytes
  status         text default 'pending' check (status in ('pending','success','failed')),
  attempts       int default 0,
  created_at     timestamptz default now(),
  printed_at     timestamptz
);
```

### Indexes for Speed

```sql
-- Hot path queries
create index idx_orders_restaurant_status on orders(restaurant_id, status);
create index idx_orders_table on orders(table_id) where status not in ('closed','void');
create index idx_order_items_order on order_items(order_id);
create index idx_order_items_restaurant_status on order_items(restaurant_id, status);
create index idx_tables_restaurant on tables(restaurant_id);
create index idx_print_jobs_pending on print_jobs(restaurant_id) where status = 'pending';

-- Realtime filtering (Supabase uses these)
create index idx_orders_updated on orders(updated_at desc);
create index idx_order_items_updated on order_items(updated_at desc);
```

---

## 5. Row-Level Security (RLS)

Every table is filtered by `restaurant_id` matching the JWT claim. Staff only see their own restaurant's data.

```sql
-- Example for orders
alter table orders enable row level security;

create policy "staff see own restaurant orders"
  on orders for all
  using (
    restaurant_id = (
      select restaurant_id from staff where id = auth.uid()
    )
  );
```

---

## 6. Realtime Subscriptions Strategy

### What subscribes to what

| Device | Subscribes to | Filter |
|--------|--------------|--------|
| POS Tablet | `orders`, `tables` | `restaurant_id=eq.{id}` |
| KDS Screen | `order_items` | `restaurant_id=eq.{id}` + join to station's categories |
| Manager Display | `orders`, `payments` | `restaurant_id=eq.{id}` |

### Subscription code pattern

```typescript
// Order realtime subscription
const orderChannel = supabase
  .channel('restaurant-orders')
  .on(
    'postgres_changes',
    {
      event: '*',               // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'orders',
      filter: `restaurant_id=eq.${restaurantId}`
    },
    (payload) => {
      // Zustand store update — immediate, no re-fetch
      useOrderStore.getState().handleRealtimeEvent(payload);
    }
  )
  .subscribe();
```

### Optimistic UI Pattern

```
User taps "Send to Kitchen"
       │
       ▼
┌─────────────────────────┐
│  1. Update Zustand store │  ← IMMEDIATE (0ms perceived)
│     order.status = sent  │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  2. Supabase mutation    │  ← async, ~50-150ms
│     update orders...     │
└──────────┬──────────────┘
           │
     ┌─────┴──────┐
     │ success    │ failure
     ▼            ▼
  Realtime     Rollback
  confirms     Zustand +
  (noop)       show error
```

---

## 7. Offline Mode

### Strategy: Local-First with Sync Queue

```
ONLINE:  Mutations → Supabase directly → Realtime confirms → Zustand
OFFLINE: Mutations → WatermelonDB local → SyncQueue → RETRY on reconnect
```

### Implementation

1. **WatermelonDB** mirrors the critical tables locally (orders, order_items, menu_items, tables)
2. **SyncQueue** (Zustand + MMKV persistence) stores pending mutations as serialized operations
3. **NetInfo** watches connectivity — on reconnect, drain the queue in order
4. **Conflict resolution**:
   - Orders: state machine is append-only (can only move forward)
   - Menu items: server wins (fetched fresh on reconnect)
   - Tables: optimistic, reconcile on reconnect

### Queue structure

```typescript
interface PendingOperation {
  id: string;                    // local UUID
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  createdAt: number;
  attempts: number;
  serverId?: string;             // set after successful sync
}
```

---

## 8. Printer Integration

### ESC/POS over TCP — Why it wins

- Port **9100** is the universal ESC/POS print port
- Any WiFi thermal printer (Star, Epson, Bixolon, HPRT, Rongta, Xprinter) accepts raw bytes on this port
- No SDK, no driver, no Bluetooth pairing ceremony
- `react-native-tcp-socket` creates a TCP socket and writes bytes — that's it

### Print flow

```
Order submitted
      │
      ▼
Routing engine groups order_items by printer
      │
      ▼
For each printer:
  ESC/POS encoder builds receipt bytes
      │
      ▼
TCP socket opens to printer.ip_address:9100
      │
      ▼
Write bytes → Close socket
      │
  ┌───┴───┐
success  failure
  │        │
Mark     Retry 3x
success  → Alert staff
```

### ESC/POS Encoder (custom, pure JS)

```typescript
class EscPosEncoder {
  private buffer: number[] = [];

  init() { this.buffer.push(0x1B, 0x40); return this; }
  bold(on: boolean) { this.buffer.push(0x1B, 0x45, on ? 1 : 0); return this; }
  align(dir: 'left'|'center'|'right') {
    const map = { left: 0, center: 1, right: 2 };
    this.buffer.push(0x1B, 0x61, map[dir]);
    return this;
  }
  text(str: string) {
    this.buffer.push(...Array.from(Buffer.from(str, 'ascii')));
    return this;
  }
  newline(n = 1) { for (let i = 0; i < n; i++) this.buffer.push(0x0A); return this; }
  cut() { this.buffer.push(0x1D, 0x56, 0x42, 0x00); return this; }  // partial cut
  build(): Uint8Array { return new Uint8Array(this.buffer); }
}
```

### Kitchen Docket Template

```
================================
   HOT KITCHEN     14:32:05
   TABLE 12 | 4 covers | T: Jay
================================
 QTY  ITEM
--------------------------------
  2x  Ribeye Steak
      - Medium rare
      - Extra sauce
  1x  Salmon (no skin)
  1x  Veg Risotto (V)
      !! ALLERGY: nuts !!
--------------------------------
  FIRE IN: 15min
================================
```

---

## 9. Application Screens

### POS App (Tablet — Staff Facing)

```
App Entry
├── Login / PIN Entry
├── Shift Start (float entry)
│
├── Table Map
│   ├── Section tabs (Indoor / Outdoor / Bar)
│   ├── Table cards (color-coded by status)
│   └── Tap table → Order View
│
├── Order View
│   ├── Left panel: Menu browser (categories → items)
│   ├── Right panel: Current order ticket
│   ├── Modifier sheet (bottom drawer)
│   ├── Send to Kitchen
│   ├── Hold (save without sending)
│   └── Bill / Payment
│
├── Payment Screen
│   ├── Cash / Card / Split
│   ├── Tip entry
│   └── Print receipt
│
└── Manager Mode (PIN-gated)
    ├── Reports (sales, staff)
    ├── Void / Refund
    └── Printer & KDS config
```

### KDS App (Tablet/Screen — Kitchen Facing)

```
KDS Display
├── Station selector (Hot Kitchen / Cold / Bar)
├── Order cards (sorted by time, oldest left)
│   ├── Table + server + time
│   ├── Item list with modifiers
│   ├── Tap item → mark preparing → mark ready
│   └── Tap card → mark whole order ready
├── Filter: All | Pending | Preparing | Ready
└── Settings (font size, alert sounds)
```

---

## 10. State Management

### Zustand Stores

```typescript
// Order store — the core
interface OrderStore {
  orders: Map<string, Order>;          // keyed by id
  activeOrderId: string | null;

  // Actions
  addItem: (item: MenuItem, modifiers: Modifier[]) => void;
  removeItem: (orderItemId: string) => void;
  sendToKitchen: () => Promise<void>;
  voidOrder: (orderId: string) => Promise<void>;

  // Realtime handler
  handleRealtimeEvent: (payload: RealtimePayload) => void;
}

// Table store
interface TableStore {
  tables: Map<string, Table>;
  sections: Section[];
  selectedSectionId: string | null;
}

// Sync store (offline queue)
interface SyncStore {
  queue: PendingOperation[];
  isOnline: boolean;
  isSyncing: boolean;
  drainQueue: () => Promise<void>;
}
```

---

## 11. Project Structure

```
/
├── apps/
│   ├── pos/                    # POS tablet app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── components/
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── hooks/
│   │   │   └── navigation/
│   │   └── package.json
│   │
│   └── kds/                    # KDS display app
│       ├── src/
│       └── package.json
│
├── packages/
│   ├── supabase/               # Shared Supabase client + types
│   │   ├── client.ts
│   │   ├── types.ts            # Generated from DB schema
│   │   └── realtime.ts
│   │
│   ├── printer/                # ESC/POS printer library
│   │   ├── EscPosEncoder.ts
│   │   ├── PrinterManager.ts   # TCP connection + retry
│   │   ├── templates/
│   │   │   ├── kitchenDocket.ts
│   │   │   └── receipt.ts
│   │   └── router.ts           # Category → printer routing
│   │
│   ├── sync/                   # Offline sync engine
│   │   ├── SyncQueue.ts
│   │   ├── WatermelonDB/
│   │   └── conflictResolver.ts
│   │
│   └── ui/                     # Shared UI components
│       ├── Button.tsx
│       ├── Badge.tsx
│       └── Card.tsx
│
├── supabase/
│   ├── migrations/             # SQL migration files
│   ├── functions/              # Edge functions
│   │   ├── process-payment/
│   │   └── void-order/
│   └── seed.sql
│
└── package.json                # Monorepo root (pnpm workspaces)
```

---

## 12. Build & Dev Setup

### Prerequisites
- Node 20+
- pnpm 9+
- Expo CLI
- Supabase CLI
- iOS Simulator or Android Emulator (or physical device)

### Commands

```bash
# Install
pnpm install

# Start Supabase locally
supabase start

# Apply migrations
supabase db push

# Start POS app
pnpm --filter pos start

# Start KDS app
pnpm --filter kds start

# Generate Supabase types
supabase gen types typescript --local > packages/supabase/types.ts
```

---

## 13. Performance Targets

| Metric | Target |
|--------|--------|
| Order → KDS display time | < 150ms (on LAN with good WiFi) |
| Order → Printer time | < 500ms (TCP open + write + close) |
| Table map load | < 200ms (from local WatermelonDB) |
| Offline order creation | 0ms (fully local) |
| Reconnect sync time | < 2s for queue of up to 50 operations |
| Menu load (600 items) | < 300ms (local cache) |

---

## 14. Phase Plan

### Phase 1 — Core POS (MVP)
- [ ] Supabase project setup + migrations
- [ ] Auth (staff login, PIN switch)
- [ ] Menu management (categories, items, modifiers)
- [ ] Table map
- [ ] Order creation + item management
- [ ] Send to kitchen (Supabase insert)
- [ ] KDS display with Realtime subscription
- [ ] ESC/POS printer integration (kitchen docket + receipt)
- [ ] Basic payment (cash + card reference)

### Phase 2 — Reliability
- [ ] Offline mode (WatermelonDB + SyncQueue)
- [ ] Printer retry logic + failure alerts
- [ ] Optimistic UI rollback on error
- [ ] Shift management

### Phase 3 — Operations
- [ ] Split bill (by seat or by item)
- [ ] Void / refund flow (manager PIN)
- [ ] Reprint
- [ ] Course management (starter / main / dessert firing)
- [ ] Wait times on KDS

### Phase 4 — Analytics
- [ ] Sales reports (hourly, daily, by item)
- [ ] Staff performance
- [ ] Menu popularity
- [ ] End-of-day Z-report (auto-print)

### Phase 5 — Scale
- [ ] Multi-site (one account, multiple restaurants)
- [ ] Online ordering integration
- [ ] Loyalty / customer database
- [ ] Card terminal integration (Stripe Terminal / SumUp)
