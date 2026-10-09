export const API_BASE_URL = 'http://YOUR_LOCAL_IP:8080/api/v1';

export const FONT_FAMILY = {
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  heading: 'SpaceGrotesk_500Medium',
  headingBold: 'SpaceGrotesk_700Bold',
};

export const COLORS = {
  primary: '#0B1220',
  secondary: '#18263D',
  accent: '#B8FF3D',
  accentInk: '#0B1220',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  text: '#111827',
  textSecondary: '#596579',
  border: '#D9E0E8',
  success: '#137A50',
  warning: '#946200',
  error: '#B42335',
  info: '#2358BA',
  successTint: '#EAF6EF',
  warningTint: '#FFF5DA',
  errorTint: '#FFF0F2',
  infoTint: '#EBF2FF',
  darkTextSecondary: '#A6B3C6',
  darkDivider: '#344258',
  white: '#FFFFFF',
  black: '#000000',
  dark: '#0B1220',
  disabled: '#D9E0E8',

  // Compatibility aliases for existing screen styles.
  primaryDark: '#0B1220',
  primaryDeep: '#0B1220',
  primaryMid: '#18263D',
  primaryLight: '#B8FF3D',
  primarySoft: '#B8FF3D',
  primaryPale: '#EAF6EF',
  primaryGhost: '#F5F7FA',
  gradientStart: '#18263D',
  gradientEnd: '#0B1220',
  textLight: '#596579',
  card: '#FFFFFF',
  sos: '#B42335',
  sosLight: '#FFF0F2',
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
  PENDING: COLORS.warning,
  ACCEPTED: COLORS.info,
  IN_PROGRESS: COLORS.secondary,
  COMPLETED: COLORS.success,
  CANCELLED: COLORS.error,
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