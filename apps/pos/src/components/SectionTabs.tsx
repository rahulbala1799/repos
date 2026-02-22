import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Section } from '@packages/supabase/types';
import { colors, fontSize, spacing, borderRadius } from '../config/theme';

interface Props {
  sections: Section[];
  selectedId: string | null;
  onSelect: (sectionId: string | null) => void;
  tableCounts?: Record<string, number>;  // sectionId -> count of occupied tables
}

export const SectionTabs = memo(function SectionTabs({ sections, selectedId, onSelect, tableCounts }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      <TabButton
        label="All"
        isSelected={selectedId === null}
        onPress={() => onSelect(null)}
      />
      {sections.map((section) => (
        <TabButton
          key={section.id}
          label={section.name}
          isSelected={selectedId === section.id}
          onPress={() => onSelect(section.id)}
          badge={tableCounts?.[section.id]}
        />
      ))}
    </ScrollView>
  );
});

const TabButton = memo(function TabButton({
  label,
  isSelected,
  onPress,
  badge,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, isSelected && styles.tabSelected]}
    >
      <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    maxHeight: 44,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextSelected: {
    color: colors.text,
  },
  badgeContainer: {
    backgroundColor: colors.occupied,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
});
