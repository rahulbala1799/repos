# Restaurant POS — Supabase CLI Implementation Guide

**Stack**: React Native (Expo) + Supabase + Zustand + WatermelonDB
**Why this stack**: Fastest path to production with realtime sync, offline-first, multi-tenant isolation via RLS, and zero vendor lock-in on printers. Every layer is open-source or has a generous free tier.

---

## Phase 0: Environment & Project Scaffold

### Step 1 — Install Prerequisites

```bash
# Node 20+, pnpm 9+
node -v   # should be >= 20
pnpm -v   # should be >= 9

# Supabase CLI
brew install supabase/tap/supabase   # macOS
# or: npm install -g supabase        # any OS

# Expo CLI
npx expo --version || npm install -g expo-cli

# Verify
supabase --version
```

### Step 2 — Initialize Supabase Project

```bash
mkdir restaurant-pos && cd restaurant-pos

# Initialize Supabase (creates supabase/ directory with config.toml)
supabase init

# Start local Supabase (Postgres, Auth, Realtime, Storage, Edge Functions)
supabase start
```

This gives you a local Supabase instance with:
- Postgres on `localhost:54322`
- Studio dashboard on `localhost:54323`
- Auth, Realtime, Storage all running locally
- API URL and anon key printed to console — save these

### Step 3 — Monorepo Scaffold

```bash
# Initialize pnpm workspace
pnpm init

# Create workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create directory structure
mkdir -p apps/pos apps/kds
mkdir -p packages/supabase packages/printer packages/sync packages/ui
```

### Step 4 — Create Expo Apps

```bash
# POS app (bare workflow for TCP socket access)
cd apps
npx create-expo-app pos --template bare-minimum
cd pos && pnpm add zustand @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
cd ../..

# KDS app (simpler — can be managed workflow initially)
cd apps
npx create-expo-app kds --template bare-minimum
cd kds && pnpm add zustand
cd ../..
```

---

## Phase 1: Database — Migrations with Supabase CLI

This is where the CLI shines. Every schema change is a versioned migration file.

### Step 5 — Create Core Migrations

```bash
# Each command creates a timestamped SQL file in supabase/migrations/
supabase migration new create_restaurants
supabase migration new create_staff_and_auth
supabase migration new create_venue_layout
supabase migration new create_menu
supabase migration new create_orders
supabase migration new create_payments
supabase migration new create_kds_and_printers
supabase migration new create_indexes
supabase migration new create_rls_policies
```

Now populate each file. Below is the exact content for each migration.

#### Migration 1: `create_restaurants`

```sql
-- supabase/migrations/<timestamp>_create_restaurants.sql

create table restaurants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique not null,
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

#### Migration 2: `create_staff_and_auth`

```sql
create table staff (
  id             uuid primary key references auth.users(id),
  restaurant_id  uuid not null references restaurants(id),
  display_name   text not null,
  role           text not null check (role in ('owner','manager','server','kitchen','cashier')),
  pin            text,
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

#### Migration 3: `create_venue_layout`

```sql
create table sections (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,
  sort_order     int default 0,
  active         boolean default true
);

create table tables (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  section_id     uuid references sections(id),
  name           text not null,
  capacity       int,
  status         text default 'available' check (status in ('available','occupied','reserved','cleaning')),
  current_order_id uuid
);
```

#### Migration 4: `create_menu`

```sql
create table menu_categories (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,
  color          text,
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
  tax_rate       numeric(5,2),
  available      boolean default true,
  sort_order     int default 0
);

create table modifier_groups (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,
  required       boolean default false,
  min_select     int default 0,
  max_select     int default 1,
  sort_order     int default 0
);

create table modifiers (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references modifier_groups(id),
  name           text not null,
  price_delta    numeric(10,2) default 0,
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

#### Migration 5: `create_orders`

```sql
create table orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  table_id       uuid references tables(id),
  section_id     uuid references sections(id),
  staff_id       uuid references staff(id),
  status         text not null default 'open' check (
                   status in ('open','submitted','acknowledged','preparing','ready','served','closed','void')
                 ),
  covers         int default 1,
  notes          text,
  total          numeric(10,2) default 0,
  submitted_at   timestamptz,
  closed_at      timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id),
  restaurant_id  uuid not null references restaurants(id),
  menu_item_id   uuid not null references menu_items(id),
  name           text not null,
  price          numeric(10,2) not null,
  quantity       int not null default 1,
  notes          text,
  status         text not null default 'pending' check (
                   status in ('pending','sent','acknowledged','preparing','ready','served','void')
                 ),
  seat           int,
  sent_at        timestamptz,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table order_item_modifiers (
  id             uuid primary key default gen_random_uuid(),
  order_item_id  uuid not null references order_items(id),
  modifier_id    uuid references modifiers(id),
  name           text not null,
  price_delta    numeric(10,2) default 0
);
```

#### Migration 6: `create_payments`

```sql
create table payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id),
  restaurant_id  uuid not null references restaurants(id),
  method         text not null check (method in ('cash','card','split','voucher','complimentary')),
  amount         numeric(10,2) not null,
  tip_amount     numeric(10,2) default 0,
  reference      text,
  staff_id       uuid references staff(id),
  created_at     timestamptz default now()
);
```

#### Migration 7: `create_kds_and_printers`

```sql
create table kds_stations (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,
  display_order  int default 0,
  active         boolean default true
);

create table kds_station_categories (
  station_id     uuid references kds_stations(id),
  category_id    uuid references menu_categories(id),
  primary key (station_id, category_id)
);

create table printers (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  name           text not null,
  ip_address     text not null,
  port           int default 9100,
  paper_width    int default 80,
  type           text default 'kitchen' check (type in ('kitchen','receipt','label')),
  active         boolean default true
);

create table printer_routing (
  printer_id     uuid references printers(id),
  category_id    uuid references menu_categories(id),
  primary key (printer_id, category_id)
);

create table print_jobs (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  printer_id     uuid references printers(id),
  order_id       uuid references orders(id),
  type           text check (type in ('kitchen_docket','receipt','void','reprint')),
  payload        bytea,
  status         text default 'pending' check (status in ('pending','success','failed')),
  attempts       int default 0,
  created_at     timestamptz default now(),
  printed_at     timestamptz
);
```

#### Migration 8: `create_indexes`

```sql
create index idx_orders_restaurant_status on orders(restaurant_id, status);
create index idx_orders_table on orders(table_id) where status not in ('closed','void');
create index idx_order_items_order on order_items(order_id);
create index idx_order_items_restaurant_status on order_items(restaurant_id, status);
create index idx_tables_restaurant on tables(restaurant_id);
create index idx_print_jobs_pending on print_jobs(restaurant_id) where status = 'pending';
create index idx_orders_updated on orders(updated_at desc);
create index idx_order_items_updated on order_items(updated_at desc);
```

#### Migration 9: `create_rls_policies`

```sql
-- Enable RLS on all tables
alter table restaurants enable row level security;
alter table restaurant_settings enable row level security;
alter table staff enable row level security;
alter table shifts enable row level security;
alter table sections enable row level security;
alter table tables enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table modifier_groups enable row level security;
alter table modifiers enable row level security;
alter table menu_item_modifier_groups enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_modifiers enable row level security;
alter table payments enable row level security;
alter table kds_stations enable row level security;
alter table kds_station_categories enable row level security;
alter table printers enable row level security;
alter table printer_routing enable row level security;
alter table print_jobs enable row level security;

-- Helper function: get current user's restaurant_id
create or replace function auth.restaurant_id()
returns uuid as $$
  select restaurant_id from public.staff where id = auth.uid()
$$ language sql security definer stable;

-- Policy template: staff see own restaurant data
-- Applied to every tenant-scoped table

create policy "tenant_isolation" on restaurants for all
  using (id = auth.restaurant_id());

create policy "tenant_isolation" on restaurant_settings for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on staff for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on shifts for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on sections for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on tables for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on menu_categories for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on menu_items for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on modifier_groups for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on orders for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on order_items for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on payments for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on kds_stations for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on printers for all
  using (restaurant_id = auth.restaurant_id());

create policy "tenant_isolation" on print_jobs for all
  using (restaurant_id = auth.restaurant_id());

-- Modifier-related tables need join-based policies
create policy "tenant_isolation" on modifiers for all
  using (
    group_id in (
      select id from modifier_groups where restaurant_id = auth.restaurant_id()
    )
  );

create policy "tenant_isolation" on menu_item_modifier_groups for all
  using (
    item_id in (
      select id from menu_items where restaurant_id = auth.restaurant_id()
    )
  );

create policy "tenant_isolation" on order_item_modifiers for all
  using (
    order_item_id in (
      select id from order_items where restaurant_id = auth.restaurant_id()
    )
  );

create policy "tenant_isolation" on kds_station_categories for all
  using (
    station_id in (
      select id from kds_stations where restaurant_id = auth.restaurant_id()
    )
  );

create policy "tenant_isolation" on printer_routing for all
  using (
    printer_id in (
      select id from printers where restaurant_id = auth.restaurant_id()
    )
  );
```

### Step 6 — Apply Migrations & Generate Types

```bash
# Apply all migrations to local Supabase
supabase db push

# Verify in Studio (http://localhost:54323)
# Check Tables → all tables should be visible

# Generate TypeScript types from your schema
supabase gen types typescript --local > packages/supabase/types.ts
```

### Step 7 — Seed Data for Development

```bash
supabase migration new seed_dev_data
```

```sql
-- supabase/migrations/<timestamp>_seed_dev_data.sql
-- OR put this in supabase/seed.sql for repeatable seeding

-- Demo restaurant
insert into restaurants (id, name, slug, currency) values
  ('a0000000-0000-0000-0000-000000000001', 'Demo Bistro', 'demo-bistro', 'EUR');

insert into restaurant_settings (restaurant_id, receipt_header, receipt_footer, tax_rate) values
  ('a0000000-0000-0000-0000-000000000001', 'DEMO BISTRO\n123 Main St', 'Thank you!', 9.00);

-- Sections
insert into sections (id, restaurant_id, name, sort_order) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Indoor', 0),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Outdoor', 1),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Bar', 2);

-- Tables
insert into tables (restaurant_id, section_id, name, capacity) values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'T1', 4),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'T2', 4),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'T3', 6),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'T4', 2),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'P1', 4),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'P2', 6),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'B1', 2),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'B2', 2);

-- Menu categories
insert into menu_categories (id, restaurant_id, name, color, sort_order) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Starters', '#4CAF50', 0),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mains', '#FF9800', 1),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Desserts', '#E91E63', 2),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Drinks', '#2196F3', 3);

-- Menu items
insert into menu_items (restaurant_id, category_id, name, price, sort_order) values
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Garlic Bread', 5.50, 0),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Soup of the Day', 6.00, 1),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Bruschetta', 7.50, 2),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Ribeye Steak', 28.00, 0),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Grilled Salmon', 22.00, 1),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Chicken Parm', 18.00, 2),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Veg Risotto', 16.00, 3),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Tiramisu', 9.00, 0),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Cheesecake', 8.50, 1),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Espresso', 3.00, 0),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'House Wine (glass)', 7.00, 1),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Beer (draft)', 5.50, 2),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Water', 2.50, 3);

-- KDS stations
insert into kds_stations (id, restaurant_id, name, display_order) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Hot Kitchen', 0),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Cold Kitchen', 1),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Bar', 2);

-- Route categories to KDS stations
insert into kds_station_categories (station_id, category_id) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),  -- Starters -> Hot Kitchen
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002'),  -- Mains -> Hot Kitchen
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003'),  -- Desserts -> Cold Kitchen
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004'); -- Drinks -> Bar
```

---

## Phase 2: Supabase Client & Realtime Setup

### Step 8 — Shared Supabase Package

Create `packages/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 40,  // high throughput for busy restaurants
    },
  },
});
```

Create `packages/supabase/realtime.ts`:

```typescript
import { supabase } from './client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'orders' | 'order_items' | 'tables' | 'payments';
type ChangeHandler = (payload: RealtimePostgresChangesPayload<any>) => void;

export function subscribeToTable(
  restaurantId: string,
  table: TableName,
  handler: ChangeHandler
) {
  return supabase
    .channel(`${table}-${restaurantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      handler
    )
    .subscribe();
}

export function unsubscribeAll() {
  supabase.removeAllChannels();
}
```

### Step 9 — Enable Realtime for Hot Tables

```bash
supabase migration new enable_realtime
```

```sql
-- supabase/migrations/<timestamp>_enable_realtime.sql

-- Only enable realtime on tables that need live updates
-- This keeps Postgres replication slots lean
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table tables;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table print_jobs;
```

```bash
supabase db push
```

---

## Phase 3: Edge Functions

### Step 10 — Submit Order (Server-Side Validation)

```bash
supabase functions new submit-order
```

Edit `supabase/functions/submit-order/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { orderId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Validate order exists and is in 'open' status
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }

  if (order.status !== 'open') {
    return new Response(JSON.stringify({ error: `Cannot submit order in ${order.status} status` }), { status: 400 });
  }

  if (!order.order_items?.length) {
    return new Response(JSON.stringify({ error: 'Order has no items' }), { status: 400 });
  }

  // 2. Calculate total
  const total = order.order_items.reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  // 3. Update order status + total
  const now = new Date().toISOString();
  await supabase
    .from('orders')
    .update({ status: 'submitted', total, submitted_at: now, updated_at: now })
    .eq('id', orderId);

  // 4. Mark all pending items as 'sent'
  await supabase
    .from('order_items')
    .update({ status: 'sent', sent_at: now, updated_at: now })
    .eq('order_id', orderId)
    .eq('status', 'pending');

  // 5. Update table status
  if (order.table_id) {
    await supabase
      .from('tables')
      .update({ status: 'occupied', current_order_id: orderId })
      .eq('id', order.table_id);
  }

  return new Response(JSON.stringify({ success: true, total }), { status: 200 });
});
```

### Step 11 — Process Payment Edge Function

```bash
supabase functions new process-payment
```

```typescript
// supabase/functions/process-payment/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { orderId, method, amount, tipAmount, reference, staffId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: order } = await supabase
    .from('orders')
    .select('id, restaurant_id, total, status')
    .eq('id', orderId)
    .single();

  if (!order || order.status === 'closed' || order.status === 'void') {
    return new Response(JSON.stringify({ error: 'Invalid order' }), { status: 400 });
  }

  // Record payment
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      restaurant_id: order.restaurant_id,
      method,
      amount,
      tip_amount: tipAmount || 0,
      reference,
      staff_id: staffId,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Check if fully paid
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('order_id', orderId);

  const totalPaid = (allPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  if (totalPaid >= Number(order.total)) {
    // Close order and free table
    const now = new Date().toISOString();
    await supabase
      .from('orders')
      .update({ status: 'closed', closed_at: now, updated_at: now })
      .eq('id', orderId);

    // Free the table
    const { data: fullOrder } = await supabase
      .from('orders')
      .select('table_id')
      .eq('id', orderId)
      .single();

    if (fullOrder?.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'available', current_order_id: null })
        .eq('id', fullOrder.table_id);
    }
  }

  return new Response(JSON.stringify({ payment, totalPaid, orderTotal: order.total }), { status: 200 });
});
```

### Step 12 — Deploy & Test Edge Functions Locally

```bash
# Serve locally (hot reload)
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/submit-order \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"orderId": "some-uuid"}'
```

---

## Phase 4: Accounting Integration Architecture

**This is the key decision point for speed + accuracy.**

### Step 13 — Accounting Sync Strategy

The approach: **Event-driven webhooks via Edge Functions + a journal entry buffer table.**

Instead of directly calling Xero/QuickBooks/MYOB on every transaction, we:
1. Buffer all financial events in a `journal_entries` table
2. An Edge Function syncs batches to the accounting provider on a schedule (or on demand)
3. This decouples POS speed from API latency of accounting providers

```bash
supabase migration new create_accounting_integration
```

```sql
-- supabase/migrations/<timestamp>_create_accounting_integration.sql

-- Accounting provider configuration per restaurant
create table accounting_connections (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  provider       text not null check (provider in ('xero','quickbooks','myob','sage','manual')),
  access_token   text,           -- encrypted via Vault in production
  refresh_token  text,
  tenant_id      text,           -- Xero org ID / QB company ID
  settings       jsonb default '{}',  -- provider-specific mappings
  connected_at   timestamptz,
  expires_at     timestamptz,
  active         boolean default true,
  created_at     timestamptz default now()
);

-- Revenue account mappings: map POS categories to accounting chart of accounts
create table account_mappings (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references restaurants(id),
  connection_id    uuid not null references accounting_connections(id),
  pos_category     text not null,     -- 'food_revenue', 'beverage_revenue', 'tips', 'tax', etc.
  account_code     text not null,     -- the code in Xero/QB (e.g., '200', '4-1000')
  account_name     text,
  created_at       timestamptz default now()
);

-- Journal entry buffer — the heart of accounting sync
create table journal_entries (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id),
  connection_id  uuid references accounting_connections(id),
  entry_date     date not null,
  reference      text,               -- "POS Daily Summary 2026-02-21" or order ID
  narration      text,
  line_items     jsonb not null,      -- [{account_code, description, debit, credit}]
  source_type    text check (source_type in ('daily_summary','individual_order','void','refund')),
  source_id      uuid,               -- order_id or shift_id
  sync_status    text default 'pending' check (sync_status in ('pending','syncing','synced','failed','skipped')),
  sync_error     text,
  external_id    text,               -- ID in the accounting system after sync
  synced_at      timestamptz,
  created_at     timestamptz default now()
);

create index idx_journal_entries_pending on journal_entries(restaurant_id, sync_status)
  where sync_status in ('pending', 'failed');

-- Enable RLS
alter table accounting_connections enable row level security;
alter table account_mappings enable row level security;
alter table journal_entries enable row level security;

create policy "tenant_isolation" on accounting_connections for all
  using (restaurant_id = auth.restaurant_id());
create policy "tenant_isolation" on account_mappings for all
  using (restaurant_id = auth.restaurant_id());
create policy "tenant_isolation" on journal_entries for all
  using (restaurant_id = auth.restaurant_id());
```

### Step 14 — Daily Summary Journal Entry Generator

```bash
supabase functions new generate-daily-journal
```

```typescript
// supabase/functions/generate-daily-journal/index.ts
// Runs at end-of-day (triggered by cron or manager action)
// Aggregates all closed orders into a single journal entry for the accounting system

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { restaurantId, date } = await req.json();  // date = 'YYYY-MM-DD'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Get all closed orders for the date
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id, total, status, closed_at,
      order_items(name, price, quantity, menu_item_id,
        menu_items:menu_item_id(category_id,
          menu_categories:category_id(name)
        )
      ),
      payments(method, amount, tip_amount)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'closed')
    .gte('closed_at', dayStart)
    .lte('closed_at', dayEnd);

  if (!orders?.length) {
    return new Response(JSON.stringify({ message: 'No closed orders for this date' }), { status: 200 });
  }

  // 2. Get account mappings
  const { data: mappings } = await supabase
    .from('account_mappings')
    .select('*')
    .eq('restaurant_id', restaurantId);

  const accountMap = new Map((mappings || []).map(m => [m.pos_category, m.account_code]));

  // 3. Aggregate by category and payment method
  let foodRevenue = 0;
  let beverageRevenue = 0;
  let totalCash = 0;
  let totalCard = 0;
  let totalTips = 0;

  for (const order of orders) {
    for (const item of order.order_items || []) {
      const categoryName = (item as any).menu_items?.menu_categories?.name || '';
      const lineTotal = item.price * item.quantity;
      if (categoryName === 'Drinks') {
        beverageRevenue += lineTotal;
      } else {
        foodRevenue += lineTotal;
      }
    }
    for (const payment of order.payments || []) {
      if (payment.method === 'cash') totalCash += Number(payment.amount);
      else totalCard += Number(payment.amount);
      totalTips += Number(payment.tip_amount || 0);
    }
  }

  // 4. Get restaurant tax rate
  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('tax_rate')
    .eq('restaurant_id', restaurantId)
    .single();

  const taxRate = Number(settings?.tax_rate || 0) / 100;
  const totalRevenue = foodRevenue + beverageRevenue;
  const taxAmount = totalRevenue * taxRate / (1 + taxRate);  // extract tax from gross
  const netRevenue = totalRevenue - taxAmount;

  // 5. Build journal entry line items (double-entry)
  const lineItems = [
    // Debits (what we received)
    { account_code: accountMap.get('cash') || '1000', description: 'Cash sales', debit: totalCash, credit: 0 },
    { account_code: accountMap.get('card') || '1010', description: 'Card sales', debit: totalCard, credit: 0 },
    // Credits (revenue earned)
    { account_code: accountMap.get('food_revenue') || '4000', description: 'Food revenue', debit: 0, credit: foodRevenue - (foodRevenue * taxRate / (1 + taxRate)) },
    { account_code: accountMap.get('beverage_revenue') || '4010', description: 'Beverage revenue', debit: 0, credit: beverageRevenue - (beverageRevenue * taxRate / (1 + taxRate)) },
    // Tax liability
    { account_code: accountMap.get('tax') || '2200', description: 'VAT/GST collected', debit: 0, credit: taxAmount },
  ];

  if (totalTips > 0) {
    lineItems.push({ account_code: accountMap.get('tips') || '2100', description: 'Tips payable', debit: 0, credit: totalTips });
    lineItems[0].debit += totalTips;  // tips came in via cash/card already counted
  }

  // Filter out zero-amount lines
  const filtered = lineItems.filter(l => l.debit > 0 || l.credit > 0);

  // 6. Insert journal entry
  const { data: entry, error } = await supabase
    .from('journal_entries')
    .insert({
      restaurant_id: restaurantId,
      entry_date: date,
      reference: `POS Daily Summary ${date}`,
      narration: `${orders.length} orders | Cash: ${totalCash.toFixed(2)} | Card: ${totalCard.toFixed(2)}`,
      line_items: filtered,
      source_type: 'daily_summary',
      sync_status: 'pending',
    })
    .select()
    .single();

  return new Response(JSON.stringify({ entry, orderCount: orders.length }), { status: 200 });
});
```

### Step 15 — Accounting Provider Sync (Xero Example)

```bash
supabase functions new sync-to-accounting
```

```typescript
// supabase/functions/sync-to-accounting/index.ts
// Pushes pending journal entries to the connected accounting provider

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { restaurantId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Get accounting connection
  const { data: connection } = await supabase
    .from('accounting_connections')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .single();

  if (!connection) {
    return new Response(JSON.stringify({ error: 'No active accounting connection' }), { status: 400 });
  }

  // 2. Get pending journal entries
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('sync_status', ['pending', 'failed'])
    .order('entry_date', { ascending: true })
    .limit(50);

  if (!entries?.length) {
    return new Response(JSON.stringify({ message: 'Nothing to sync' }), { status: 200 });
  }

  const results = [];

  for (const entry of entries) {
    // Mark as syncing
    await supabase
      .from('journal_entries')
      .update({ sync_status: 'syncing' })
      .eq('id', entry.id);

    try {
      let externalId: string;

      switch (connection.provider) {
        case 'xero':
          externalId = await syncToXero(connection, entry);
          break;
        case 'quickbooks':
          externalId = await syncToQuickBooks(connection, entry);
          break;
        default:
          // Manual provider — just mark as synced
          externalId = `manual-${entry.id}`;
      }

      await supabase
        .from('journal_entries')
        .update({
          sync_status: 'synced',
          external_id: externalId,
          synced_at: new Date().toISOString(),
          sync_error: null,
        })
        .eq('id', entry.id);

      results.push({ id: entry.id, status: 'synced', externalId });
    } catch (err) {
      await supabase
        .from('journal_entries')
        .update({
          sync_status: 'failed',
          sync_error: (err as Error).message,
        })
        .eq('id', entry.id);

      results.push({ id: entry.id, status: 'failed', error: (err as Error).message });
    }
  }

  return new Response(JSON.stringify({ results }), { status: 200 });
});

// --- Provider implementations ---

async function syncToXero(connection: any, entry: any): Promise<string> {
  // Refresh token if expired
  let accessToken = connection.access_token;
  if (new Date(connection.expires_at) < new Date()) {
    accessToken = await refreshXeroToken(connection);
  }

  const journalPayload = {
    Date: entry.entry_date,
    Narration: entry.narration,
    Reference: entry.reference,
    JournalLines: entry.line_items.map((line: any) => ({
      AccountCode: line.account_code,
      Description: line.description,
      LineAmount: line.debit > 0 ? line.debit : -line.credit,
    })),
  };

  const response = await fetch('https://api.xero.com/api.xro/2.0/ManualJournals', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Xero-Tenant-Id': connection.tenant_id,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(journalPayload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Xero API error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return result.ManualJournals[0].ManualJournalID;
}

async function refreshXeroToken(connection: any): Promise<string> {
  // Implement OAuth2 token refresh for Xero
  // Store refreshed tokens back in accounting_connections
  throw new Error('Token refresh not yet implemented');
}

async function syncToQuickBooks(connection: any, entry: any): Promise<string> {
  // Similar pattern to Xero but with QuickBooks API format
  // QuickBooks uses /v3/company/{companyId}/journalentry
  throw new Error('QuickBooks sync not yet implemented');
}
```

---

## Phase 5: Supabase CLI Workflow Commands

### Everyday Development Commands

```bash
# --- Schema changes ---
supabase migration new <descriptive_name>    # create migration
supabase db push                              # apply to local
supabase db reset                             # nuke & rebuild from migrations
supabase db diff --schema public              # auto-generate migration from Studio changes

# --- Types ---
supabase gen types typescript --local > packages/supabase/types.ts

# --- Edge Functions ---
supabase functions new <name>                 # scaffold
supabase functions serve                      # local dev (hot reload)
supabase functions deploy <name>              # deploy to production

# --- Testing ---
supabase test db                              # run pgTAP tests
supabase inspect db calls                     # see function call stats
supabase inspect db index-usage               # check index efficiency

# --- Branching (Supabase Pro) ---
supabase branches create feature-x            # preview branch with isolated DB
supabase branches list
supabase branches delete feature-x

# --- Deploy to Production ---
supabase link --project-ref <your-project-ref>
supabase db push                              # apply migrations to prod
supabase functions deploy --no-verify-jwt     # deploy all edge functions
```

### Environment Setup

```bash
# .env.local (for Expo apps)
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
```

---

## Phase 6: Cron Jobs via pg_cron

### Step 16 — Automated Daily Journal Generation

```bash
supabase migration new setup_cron_jobs
```

```sql
-- Enable pg_cron extension
create extension if not exists pg_cron;

-- Generate daily journal entries at 4 AM for each restaurant
select cron.schedule(
  'daily-journal-generation',
  '0 4 * * *',  -- 4:00 AM daily
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/generate-daily-journal',
    body := json_build_object(
      'restaurantId', r.id,
      'date', (current_date - interval '1 day')::date::text
    )::jsonb,
    headers := json_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )::jsonb
  )
  from restaurants r;
  $$
);

-- Sync pending journal entries every 30 minutes
select cron.schedule(
  'accounting-sync',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-to-accounting',
    body := json_build_object('restaurantId', r.id)::jsonb,
    headers := json_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )::jsonb
  )
  from restaurants r
  where exists (
    select 1 from accounting_connections ac
    where ac.restaurant_id = r.id and ac.active = true
  );
  $$
);
```

---

## Phase 7: Testing with Supabase CLI

### Step 17 — Database Tests (pgTAP)

```bash
mkdir -p supabase/tests
```

Create `supabase/tests/rls_test.sql`:

```sql
begin;
select plan(3);

-- Test: unauthenticated users see nothing
select is(
  (select count(*) from orders)::int,
  0,
  'Unauthenticated users should see no orders'
);

-- Test: RLS function exists
select has_function('auth', 'restaurant_id');

-- Test: indexes exist
select has_index('public', 'orders', 'idx_orders_restaurant_status');

select * from finish();
rollback;
```

```bash
supabase test db
```

---

## Summary: What You Get

| Concern | Solution | CLI Command |
|---------|----------|-------------|
| Schema versioning | Migration files | `supabase migration new` |
| Local dev | Full Supabase stack | `supabase start` |
| Type safety | Auto-generated from schema | `supabase gen types typescript` |
| Server logic | Edge Functions (Deno) | `supabase functions serve/deploy` |
| Multi-tenant security | RLS policies | Applied via migrations |
| Realtime sync | Postgres publications | Enabled via migration |
| Accounting integration | Journal buffer + sync functions | Edge Function + pg_cron |
| Testing | pgTAP | `supabase test db` |
| Deploy | Link + push | `supabase link && supabase db push` |

### Accounting Integration Flow

```
Order closed → Payment recorded
                    │
              ┌─────▼──────┐
              │  pg_cron    │  (4 AM daily, or on-demand)
              │  triggers   │
              └─────┬──────┘
                    │
              ┌─────▼──────────────┐
              │ generate-daily-     │
              │ journal (Edge Fn)   │
              │ Aggregates orders   │
              │ into double-entry   │
              │ journal entry       │
              └─────┬──────────────┘
                    │
              ┌─────▼──────────────┐
              │ journal_entries     │
              │ table (buffer)      │
              │ sync_status=pending │
              └─────┬──────────────┘
                    │
              ┌─────▼──────────────┐
              │ sync-to-accounting  │  (every 30 min via pg_cron)
              │ (Edge Fn)           │
              │ Xero / QuickBooks / │
              │ MYOB / Sage         │
              └─────┬──────────────┘
                    │
              ┌─────▼──────────────┐
              │ External accounting │
              │ system updated      │
              │ sync_status=synced  │
              └────────────────────┘
```

### Next Steps (in order)

1. **Run `supabase start`** and apply all migrations
2. **Build the Supabase client package** and verify types generate
3. **Build the POS UI** — Table Map screen first, then Order View
4. **Wire up Realtime** — orders + tables subscriptions
5. **Add printer integration** — ESC/POS encoder + TCP socket
6. **Connect accounting** — OAuth flow for Xero/QuickBooks, map chart of accounts
7. **Add offline mode** — WatermelonDB + sync queue

Each step is independently testable. The Supabase CLI gives you `supabase db reset` to blow away and rebuild from scratch at any point during development.
