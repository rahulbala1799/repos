import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Table } from '@packages/supabase/types';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';
import { StatusBadge } from './StatusBadge';

const statusBorderColors: Record<string, string> = {
  available: colors.available,
  occupied: colors.occupied,
  reserved: colors.reserved,
  cleaning: colors.cleaning,
};

interface Props {
  table: Table;
  onPress: (table: Table) => void;
  orderTotal?: number;
  elapsed?: string;  // "12m" — time since order opened
}

export const TableCard = memo(function TableCard({ table, onPress, orderTotal, elapsed }: Props) {
  const handlePress = useCallback(() => onPress(table), [table, onPress]);
  const borderColor = statusBorderColors[table.status] || colors.border;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { borderColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.name}>{table.name}</Text>
        {elapsed && <Text style={styles.elapsed}>{elapsed}</Text>}
      </View>

      <StatusBadge status={table.status} />

      <View style={styles.bottomRow}>
        {table.capacity && (
          <Text style={styles.capacity}>{table.capacity} seats</Text>
        )}
        {orderTotal !== undefined && orderTotal > 0 && (
          <Text style={styles.total}>{orderTotal.toFixed(2)}</Text>
        )}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.lg,
    width: '48%',
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  elapsed: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  capacity: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  total: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primaryLight,
  },
});
