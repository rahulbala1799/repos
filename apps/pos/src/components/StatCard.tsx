import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
  icon?: string;  // emoji for now — swap to react-native-vector-icons later
}

export const StatCard = memo(function StatCard({
  label,
  value,
  subtitle,
  accentColor = colors.primary,
  icon,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    flex: 1,
    minWidth: 150,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: fontSize.md,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
