/**
 * FeedFlow design system.
 * Centralised so every screen shares the same palette, spacing and motion feel.
 */

export const colors = {
  // Backgrounds
  bg: '#0A0A14',
  bgDeep: '#070710',
  bgRaised: '#12121F',

  // Glass surfaces (layered over bg with opacity)
  glass: 'rgba(255,255,255,0.045)',
  glassStrong: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',

  // Brand
  violet: '#7C3AED',
  violetSoft: '#A78BFA',
  blue: '#3B82F6',
  indigo: '#6366F1',
  cyan: '#22D3EE',
  teal: '#2DD4BF',

  // Semantic
  boost: '#34D399',
  reduce: '#FB7185',
  warn: '#FBBF24',

  // Text
  text: '#F8FAFC',
  textDim: '#94A3B8',
  textMuted: '#5B6478',
} as const;

// Gradient stop arrays (consumed by expo-linear-gradient)
export const gradients = {
  brand: ['#7C3AED', '#4F46E5', '#3B82F6'] as const,
  brandSoft: ['#8B5CF6', '#6366F1'] as const,
  cyan: ['#22D3EE', '#3B82F6'] as const,
  boost: ['#34D399', '#10B981'] as const,
  reduce: ['#FB7185', '#F43F5E'] as const,
  screen: ['#0D0B1F', '#0A0A14', '#070710'] as const,
  card: ['rgba(124,58,237,0.10)', 'rgba(59,130,246,0.04)'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  hero: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

// A small curated topic catalogue used on the preferences screen.
export const TOPIC_CATALOG = [
  'Technology',
  'Artificial Intelligence',
  'Startups',
  'Business',
  'Finance',
  'Programming',
  'Science',
  'Fitness',
  'Health',
  'Education',
  'Travel',
  'Gaming',
  'Design',
  'Photography',
] as const;
