import React, { useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, fontSize, spacing } from '../config/theme';
import { useTableStore } from '../stores/tableStore';
import { useOrderStore } from '../stores/orderStore';
import { useAuthStore } from '../stores/authStore';
import { SectionTabs } from '../components/SectionTabs';
import { TableCard } from '../components/TableCard';
import { LiveIndicator } from '../components/LiveIndicator';
import { Table } from '@packages/supabase/types';

interface Props {
  navigation: any;
}

export function TableMapScreen({ navigation }: Props) {
  const restaurant = useAuthStore((s) => s.restaurant);
  const staff = useAuthStore((s) => s.staff);
  const sections = useTableStore((s) => s.sections);
  const selectedSectionId = useTableStore((s) => s.selectedSectionId);
  const selectSection = useTableStore((s) => s.selectSection);
  const tablesForSection = useTableStore((s) => s.tablesForSection);
  const loadTables = useTableStore((s) => s.loadTables);
  const orders = useOrderStore((s) => s.orders);
  const createOrder = useOrderStore((s) => s.createOrder);

  const restaurantId = restaurant?.id;

  useEffect(() => {
    if (restaurantId) {
      loadTables(restaurantId);
    }
  }, [restaurantId, loadTables]);

  const displayTables = tablesForSection(selectedSectionId);

  // Count occupied tables per section for tab badges
  const occupiedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const allTables = tablesForSection(null);
    allTables.forEach((t) => {
      if (t.status === 'occupied' && t.section_id) {
        counts[t.section_id] = (counts[t.section_id] || 0) + 1;
      }
    });
    return counts;
  }, [tablesForSection]);

  // Map table IDs to their active order totals
  const tableOrderTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    orders.forEach((order) => {
      if (order.table_id && !['closed', 'void'].includes(order.status)) {
        totals[order.table_id] = (totals[order.table_id] || 0) + Number(order.total);
      }
    });
    return totals;
  }, [orders]);

  // Elapsed time since table was occupied
  const tableElapsed = useMemo(() => {
    const elapsed: Record<string, string> = {};
    orders.forEach((order) => {
      if (order.table_id && !['closed', 'void'].includes(order.status)) {
        const diffMs = Date.now() - new Date(order.created_at).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) elapsed[order.table_id] = `${mins}m`;
        else elapsed[order.table_id] = `${Math.floor(mins / 60)}h${mins % 60}m`;
      }
    });
    return elapsed;
  }, [orders]);

  const handleTablePress = useCallback(async (table: Table) => {
    if (!restaurantId || !staff?.id) return;

    if (table.status === 'available') {
      // Create new order for this table
      try {
        const orderId = await createOrder(table.id, staff.id, restaurantId);
        navigation.navigate('OrderView', { orderId, tableId: table.id });
      } catch {
        // Error handled by store
      }
    } else if (table.current_order_id) {
      navigation.navigate('OrderView', { orderId: table.current_order_id, tableId: table.id });
    }
  }, [restaurantId, staff, createOrder, navigation]);

  const renderTable = useCallback(({ item }: { item: Table }) => (
    <TableCard
      table={item}
      onPress={handleTablePress}
      orderTotal={tableOrderTotals[item.id]}
      elapsed={tableElapsed[item.id]}
    />
  ), [handleTablePress, tableOrderTotals, tableElapsed]);

  const keyExtractor = useCallback((item: Table) => item.id, []);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tables</Text>
          <Text style={styles.subtitle}>
            {displayTables.length} tables
            {selectedSectionId ? ` in ${sections.find((s) => s.id === selectedSectionId)?.name}` : ''}
          </Text>
        </View>
        <LiveIndicator />
      </View>

      {/* Section Tabs */}
      <View style={styles.tabsContainer}>
        <SectionTabs
          sections={sections}
          selectedId={selectedSectionId}
          onSelect={selectSection}
          tableCounts={occupiedCounts}
        />
      </View>

      {/* Table Grid */}
      <FlatList
        data={displayTables}
        renderItem={renderTable}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        // Performance: don't re-render all tables on scroll
        removeClippedSubviews={true}
        maxToRenderPerBatch={12}
        windowSize={5}
      />
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
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabsContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  grid: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
});
