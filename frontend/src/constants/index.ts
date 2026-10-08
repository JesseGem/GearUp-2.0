export const API_BASE_URL = 'http://YOUR_LOCAL_IP:8080/api/v1';

export const COLORS = {
  // ── Primary green palette ──────────────
  primary: '#2d6a4f',
  primaryDark: '#1b4332',
  primaryDeep: '#081c15',
  primaryMid: '#40916c',
  primaryLight: '#52b788',
  primarySoft: '#95d5b2',
  primaryPale: '#b7e4c7',
  primaryGhost: '#d8f3dc',

  // ── Gradient stops ─────────────────────
  gradientStart: '#52b788',
  gradientEnd: '#1b4332',

  // ── Neutrals ───────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  dark: '#0a0a0a',
  text: '#1b1b1b',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
  card: '#FFFFFF',

  // ── Semantic ───────────────────────────
  success: '#40916c',
  error: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',

  // ── SOS ────────────────────────────────
  sos: '#dc2626',
  sosLight: '#fef2f2',
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
};

export const JOB_STATUS_COLORS: Record<string, string> = {
  PENDING: '#F57F17',
  ACCEPTED: '#1565C0',
  IN_PROGRESS: '#6A1B9A',
  COMPLETED: '#1B6E2A',
  CANCELLED: '#C62828',
};

export const SPECIALIZATIONS = [
  { key: 'ENGINE',       label: 'Engine Repair' },
  { key: 'ELECTRICAL',   label: 'Electrical' },
  { key: 'TYRES',        label: 'Tyres & Wheels' },
  { key: 'AC',           label: 'Air Conditioning' },
  { key: 'BODYWORK',     label: 'Body Work' },
  { key: 'BRAKES',       label: 'Brakes' },
  { key: 'TRANSMISSION', label: 'Transmission' },
  { key: 'GENERAL',      label: 'General Service' },
];

export const SOS_SEARCH_RADIUS_KM = 20;
export const STANDARD_SEARCH_RADIUS_KM = 50;