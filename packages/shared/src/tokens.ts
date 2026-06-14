// Design-Tokens (§7.4 Blueprint). Single source of truth fürs Branding.
//
// Designsprache „editorial minimal": viel Weißraum, Hairline-Trennlinien,
// Ink-Schwarz für primäre Aktionen, Akzent-Violett nur für Marken-Momente
// (Brand-Dot, Links, aktive Map-Pins). Kategorie-Farben erscheinen nur noch
// als kleine Flächen (Icon-Tiles, Pins), nie als große Blöcke.

export const palette = {
  accent: '#6C5CFF',
  accentMuted: '#9B8CFF',
  /** Zweitfarbe für Akzente/Verläufe (Blau). */
  accentBlue: '#3B82F6',
  /** Premium-Marken-Verlauf (Violett → Blau) für primäre Aktionen/Glas. */
  gradient: ['#6C5CFF', '#3B82F6'] as [string, string],
  success: '#20C978',
  danger: '#FF3B5C',
  light: {
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceElevated: '#EEF0F8',
    border: '#E6E8F2',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9AA1AE',
    /** Primäre Buttons/CTAs (im Dark-Scheme invertiert). */
    ink: '#111827',
    /** Text/Icons auf `ink`. */
    onInk: '#FFFFFF',
    /** „Liquid Glass": halbtransparente Kartenfläche + feine Lichtkante. */
    cardGlass: 'rgba(255,255,255,0.62)',
    glassBorder: 'rgba(255,255,255,0.70)',
    glassHighlight: 'rgba(255,255,255,0.55)',
  },
  dark: {
    background: '#0B0B0F',
    surface: '#17181C',
    surfaceElevated: '#1F2025',
    border: '#26272C',
    textPrimary: '#F4F4F6',
    textSecondary: '#A8ACB3',
    textMuted: '#6F737B',
    ink: '#F4F4F6',
    onInk: '#0B0B0F',
    cardGlass: 'rgba(28,29,35,0.55)',
    glassBorder: 'rgba(255,255,255,0.12)',
    glassHighlight: 'rgba(255,255,255,0.10)',
  },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  /** Große „Liquid Glass"-Rundungen. */
  xl: 26,
  xxl: 32,
  pill: 999,
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
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = { [K in keyof typeof palette.light]: string };

export function colorsFor(scheme: ColorScheme): ThemeColors {
  return palette[scheme];
}
