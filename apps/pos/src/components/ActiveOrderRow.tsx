import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Order } from '@packages/supabase/types';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';
import { StatusBadge } from './StatusBadge';

interface Props {
  order: Order;
  tableName?: string;
  staffName?: string;
  onPress: (orderId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export const ActiveOrderRow = memo(function ActiveOrderRow({ order, tableName, staffName, onPress }: Props) {
  const handlePress = useCallback(() => onPress(order.id), [order.id, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        <Text style={styles.table}>{tableName || '—'}</Text>
        <Text style={styles.time}>{timeAgo(order.created_at)}</Text>
      </View>

      <View style={styles.center}>
        <StatusBadge status={order.status as any} />
        {staffName && <Text style={styles.staff}>{staffName}</Text>}
      </View>

      <View style={styles.right}>
        <Text style={styles.total}>{Number(order.total).toFixed(2)}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
    backgroundColor: colors.surfaceElevated,
  },
  left: {
    width: 70,
  },
  table: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  center: {
    flex: 1,
    marginLeft: spacing.md,
  },
  staff: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  right: {
    alignItems: 'flex-end',
  },
  total: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
});
