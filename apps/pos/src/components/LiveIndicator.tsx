import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';
import { useSyncStore } from '../stores/syncStore';

export const LiveIndicator = memo(function LiveIndicator() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const queueLength = useSyncStore((s) => s.queue.length);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: isOnline ? colors.success : colors.error,
            opacity: pulseAnim,
          },
        ]}
      />
      <Text style={[styles.label, { color: isOnline ? colors.success : colors.error }]}>
        {isOnline ? 'LIVE' : 'OFFLINE'}
      </Text>
      {queueLength > 0 && (
        <View style={styles.queueBadge}>
          <Text style={styles.queueText}>{queueLength}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  queueBadge: {
    marginLeft: spacing.xs,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  queueText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.bg,
  },
});
