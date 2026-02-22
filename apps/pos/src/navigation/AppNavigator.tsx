import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { TableMapScreen } from '../screens/TableMapScreen';
import { colors, fontSize } from '../config/theme';

const Tab = createBottomTabNavigator();

// Minimal tab icon using text — swap to react-native-vector-icons when ready
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {label}
    </Text>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="H" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tables"
        component={TableMapScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="T" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={PlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="O" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={PlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="M" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="More"
        component={PlaceholderScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="..." focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Placeholder for screens we haven't built yet
function PlaceholderScreen() {
  return null;
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  icon: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textMuted,
  },
  iconFocused: {
    color: colors.primary,
  },
});
