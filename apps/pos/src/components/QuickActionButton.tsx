import React, { memo, useCallback } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';

interface Props {
  label: string;
  icon: string;
  color?: string;
  onPress: () => void;
}

export const QuickActionButton = memo(function QuickActionButton({
  label,
  icon,
  color = colors.primary,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: color + '18', borderColor: color + '44' },
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  icon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
