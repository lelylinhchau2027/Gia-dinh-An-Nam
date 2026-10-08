export const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F0F1F4',
  ink: '#303B46',
  inkMuted: '#858A91',
  primary: '#8E70CA',
  primarySoft: '#E9E2F5',
  sage: '#6C8B74',
  sageSoft: '#DDE9DF',
  amber: '#D99A42',
  amberSoft: '#F8E9CA',
  blue: '#5687A3',
  blueSoft: '#DCEBF2',
  lavender: '#7A6D9B',
  lavenderSoft: '#E8E1F2',
  danger: '#B94242',
  border: '#ECE3E7',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const shadow = {
  shadowColor: '#5D4436',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 2,
} as const;
