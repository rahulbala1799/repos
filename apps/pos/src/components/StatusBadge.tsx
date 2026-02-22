import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';

type Status = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'open' | 'submitted' | 'preparing' | 'ready' | 'served' | 'closed' | 'void';

const statusColors: Record<Status, string> = {
  available: colors.available,
  occupied: colors.occupied,
  reserved: colors.reserved,
  cleaning: colors.cleaning,
  open: colors.info,
  submitted: colors.warning,
  preparing: colors.occupied,
  ready: colors.success,
  served: colors.primaryLight,
  closed: colors.textMuted,
  void: colors.error,
};

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

export const StatusBadge = memo(function StatusBadge({ status, size = 'sm' }: Props) {
  const color = statusColors[status] || colors.textMuted;
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }, isSmall && styles.badgeSmall]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }, isSmall && styles.labelSmall]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 9,
  },
});
