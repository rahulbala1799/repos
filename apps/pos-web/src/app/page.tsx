'use client';

import { useStore } from '@/stores/useStore';
import { StatCard } from '@/components/StatCard';
import { LiveIndicator } from '@/components/LiveIndicator';
import { FloorBar } from '@/components/FloorBar';
import { QuickAction } from '@/components/QuickAction';
import { ActiveOrderRow } from '@/components/ActiveOrderRow';
import styles from './page.module.css';

export default function HomePage() {
  const restaurant = useStore((s) => s.restaurant);
  const staff = useStore((s) => s.staff);
  const isOnline = useStore((s) => s.isOnline);
  const queueLength = useStore((s) => s.queueLength);
  const stats = useStore((s) => s.todayStats)();
  const counts = useStore((s) => s.tableCounts)();
  const active = useStore((s) => s.activeOrders)();
  const tableNames = useStore((s) => s.tableNameMap)();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting}, {staff.display_name}</p>
          <h1 className={styles.title}>{restaurant.name}</h1>
        </div>
        <LiveIndicator isOnline={isOnline} queueLength={queueLength} />
      </header>

      {/* Stats */}
      <section className={styles.statsGrid}>
        <StatCard label="Revenue" value={`${stats.totalRevenue.toFixed(0)}`} subtitle={`${restaurant.currency} today`} accentColor="#00B894" />
        <StatCard label="Orders" value={stats.orderCount} subtitle="closed today" accentColor="#6C5CE7" />
        <StatCard label="Avg Order" value={`${stats.avgOrderValue.toFixed(0)}`} subtitle={restaurant.currency} accentColor="#74B9FF" />
        <StatCard label="Open" value={stats.openOrders} subtitle="active orders" accentColor="#FDCB6E" />
      </section>

      {/* Floor Status */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Floor Status</h2>
          <span className={styles.sectionSubtitle}>{counts.available}/{counts.total} available</span>
        </div>
        <FloorBar
          available={counts.available}
          occupied={counts.occupied}
          reserved={counts.reserved}
          cleaning={counts.cleaning}
          total={counts.total}
        />
      </section>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsRow}>
          <QuickAction icon="+" label="New Order" color="#00B894" />
          <QuickAction icon="$" label="Payments" color="#6C5CE7" />
          <QuickAction icon=">" label="KDS View" color="#FDCB6E" />
          <QuickAction icon="~" label="Reports" color="#74B9FF" />
        </div>
      </section>

      {/* Active Orders */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Active Orders</h2>
          <span className={styles.sectionSubtitle}>{active.length} open</span>
        </div>
        <div className={styles.orderList}>
          {active.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyText}>No active orders</p>
              <p className={styles.emptySubtext}>Tap a table to start one</p>
            </div>
          ) : (
            active.map((order) => (
              <ActiveOrderRow
                key={order.id}
                order={order}
                tableName={order.table_id ? tableNames[order.table_id] : undefined}
              />
            ))
          )}
        </div>
      </section>

      {/* Speed Banner */}
      <section className={styles.speedBanner}>
        <div className={styles.speedGrid}>
          <SpeedMetric label="Order to KDS" value="<150ms" desc="Supabase Realtime" />
          <SpeedMetric label="Order to Print" value="<500ms" desc="ESC/POS TCP" />
          <SpeedMetric label="Table Map Load" value="<200ms" desc="Local Cache" />
          <SpeedMetric label="Offline Orders" value="0ms" desc="WatermelonDB" />
          <SpeedMetric label="Reconnect Sync" value="<2s" desc="Queue Drain" />
          <SpeedMetric label="Menu (600 items)" value="<300ms" desc="Cached" />
        </div>
      </section>

      {/* Stack */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Stack</h2>
        <div className={styles.stackGrid}>
          <StackPill label="Supabase" desc="Postgres + Realtime + Auth + Edge" color="#3ECF8E" />
          <StackPill label="React Native" desc="Expo bare workflow" color="#61DAFB" />
          <StackPill label="Zustand" desc="Zero-boilerplate state" color="#764ABC" />
          <StackPill label="WatermelonDB" desc="Offline-first SQLite" color="#F7DF1E" />
          <StackPill label="ESC/POS TCP" desc="Universal WiFi printing" color="#FF6B6B" />
          <StackPill label="Next.js" desc="Web dashboard" color="#FFFFFF" />
        </div>
      </section>
    </div>
  );
}

function SpeedMetric({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricDesc}>{desc}</span>
    </div>
  );
}

function StackPill({ label, desc, color }: { label: string; desc: string; color: string }) {
  return (
    <div className={styles.stackPill} style={{ borderColor: color + '44' }}>
      <span className={styles.stackDot} style={{ backgroundColor: color }} />
      <div>
        <span className={styles.stackLabel} style={{ color }}>{label}</span>
        <span className={styles.stackDesc}>{desc}</span>
      </div>
    </div>
  );
}
