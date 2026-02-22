import React, { useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';
import { useOrderStore } from '../stores/orderStore';
import { useTableStore } from '../stores/tableStore';
import { useAuthStore } from '../stores/authStore';
import { StatCard } from '../components/StatCard';
import { LiveIndicator } from '../components/LiveIndicator';
import { ActiveOrderRow } from '../components/ActiveOrderRow';
import { QuickActionButton } from '../components/QuickActionButton';

interface Props {
  navigation: any;
}

export function HomeScreen({ navigation }: Props) {
  const restaurant = useAuthStore((s) => s.restaurant);
  const staff = useAuthStore((s) => s.staff);
  const loadOrders = useOrderStore((s) => s.loadOrders);
  const loadTables = useTableStore((s) => s.loadTables);
  const stats = useOrderStore((s) => s.todayStats);
  const activeOrders = useOrderStore((s) => s.activeOrders);
  const tableCounts = useTableStore((s) => s.counts);
  const tables = useTableStore((s) => s.tables);
  const isLoading = useOrderStore((s) => s.isLoading);

  const restaurantId = restaurant?.id;

  useEffect(() => {
    if (restaurantId) {
      loadOrders(restaurantId);
      loadTables(restaurantId);
    }
  }, [restaurantId, loadOrders, loadTables]);

  const onRefresh = useCallback(() => {
    if (restaurantId) {
      loadOrders(restaurantId);
      loadTables(restaurantId);
    }
  }, [restaurantId, loadOrders, loadTables]);

  const currentStats = stats();
  const currentTableCounts = tableCounts();
  const currentActiveOrders = activeOrders();
  const currency = restaurant?.currency || 'EUR';

  // Find table name for each order
  const tableNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    tables.forEach((t) => { map[t.id] = t.name; });
    return map;
  }, [tables]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleOrderPress = useCallback((orderId: string) => {
    navigation.navigate('OrderView', { orderId });
  }, [navigation]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}, {staff?.display_name || 'Team'}</Text>
          <Text style={styles.restaurantName}>{restaurant?.name || 'Restaurant'}</Text>
        </View>
        <LiveIndicator />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            label="Revenue"
            value={`${currentStats.totalRevenue.toFixed(0)}`}
            subtitle={`${currency} today`}
            accentColor={colors.success}
          />
          <View style={styles.statGap} />
          <StatCard
            label="Orders"
            value={currentStats.orderCount}
            subtitle="closed today"
            accentColor={colors.primary}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Avg Order"
            value={`${currentStats.avgOrderValue.toFixed(0)}`}
            subtitle={currency}
            accentColor={colors.info}
          />
          <View style={styles.statGap} />
          <StatCard
            label="Open"
            value={currentStats.openOrders}
            subtitle="active orders"
            accentColor={colors.warning}
          />
        </View>

        {/* Table Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Floor Status</Text>
          <Text style={styles.sectionSubtitle}>
            {currentTableCounts.available}/{currentTableCounts.total} available
          </Text>
        </View>

        <View style={styles.floorBar}>
          {currentTableCounts.total > 0 && (
            <>
              <View
                style={[
                  styles.floorSegment,
                  {
                    flex: currentTableCounts.available || 0.01,
                    backgroundColor: colors.available,
                    borderTopLeftRadius: borderRadius.full,
                    borderBottomLeftRadius: borderRadius.full,
                  },
                ]}
              />
              <View
                style={[
                  styles.floorSegment,
                  { flex: currentTableCounts.occupied || 0.01, backgroundColor: colors.occupied },
                ]}
              />
              <View
                style={[
                  styles.floorSegment,
                  {
                    flex: currentTableCounts.reserved || 0.01,
                    backgroundColor: colors.reserved,
                    borderTopRightRadius: borderRadius.full,
                    borderBottomRightRadius: borderRadius.full,
                  },
                ]}
              />
            </>
          )}
        </View>

        <View style={styles.legendRow}>
          <LegendItem color={colors.available} label="Available" count={currentTableCounts.available} />
          <LegendItem color={colors.occupied} label="Occupied" count={currentTableCounts.occupied} />
          <LegendItem color={colors.reserved} label="Reserved" count={currentTableCounts.reserved} />
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.actionsRow}>
          <QuickActionButton
            icon="+"
            label="New Order"
            color={colors.success}
            onPress={() => navigation.navigate('Tables')}
          />
          <QuickActionButton
            icon="$"
            label="Payments"
            color={colors.primary}
            onPress={() => navigation.navigate('Payments')}
          />
          <QuickActionButton
            icon="#"
            label="KDS View"
            color={colors.warning}
            onPress={() => navigation.navigate('KDS')}
          />
          <QuickActionButton
            icon="@"
            label="Reports"
            color={colors.info}
            onPress={() => navigation.navigate('Reports')}
          />
        </View>

        {/* Active Orders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Orders</Text>
          <Text style={styles.sectionSubtitle}>{currentActiveOrders.length} open</Text>
        </View>

        {currentActiveOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>~</Text>
            <Text style={styles.emptyText}>No active orders</Text>
            <Text style={styles.emptySubtext}>Tap a table to start one</Text>
          </View>
        ) : (
          currentActiveOrders.slice(0, 10).map((order) => (
            <ActiveOrderRow
              key={order.id}
              order={order}
              tableName={order.table_id ? tableNameMap[order.table_id] : undefined}
              onPress={handleOrderPress}
            />
          ))
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// Small inline component — not worth a separate file
function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl + 20, // safe area
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  restaurantName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  statGap: {
    width: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  floorBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  floorSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  legendLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  legendCount: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 40,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
