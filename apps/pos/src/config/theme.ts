// Minimal, performance-first theme — no heavy UI library
// All values are plain numbers/strings for zero-overhead styling

export const colors = {
  // Core
  bg: '#0F1117',
  surface: '#1A1D27',
  surfaceElevated: '#242736',
  border: '#2E3144',

  // Brand
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDim: '#4834D4',

  // Status — table/order colors
  available: '#00B894',
  occupied: '#E17055',
  reserved: '#FDCB6E',
  cleaning: '#74B9FF',

  // Semantic
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF6B6B',
  info: '#74B9FF',

  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A3B1',
  textMuted: '#6B6E7B',

  // Category defaults
  starters: '#4CAF50',
  mains: '#FF9800',
  desserts: '#E91E63',
  drinks: '#2196F3',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;
