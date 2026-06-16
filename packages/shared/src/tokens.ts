// Design-Tokens (§7.4 Blueprint). Single source of truth fürs Branding.
//
// Designsprache „premium minimal" (Trade-Republic-Ruhe): viel Weißraum,
// fast-schwarze Schrift, neutrale Grautöne, EIN kräftiger Lila-Akzent.
// Keine Regenbogen-Verläufe, keine bunten Blöcke — Farbe nur als Akzent.

export const palette = {
  /** Marken-Lila (dots.-Punkt). Einziger Farbakzent: Buttons, Tabs, aktive Pins. */
  accent: '#6C5CFF',
  accentMuted: '#9B8CFF',
  /** Zweitfarbe (Blau) — nur noch selten, z. B. Karten-Akzente. */
  accentBlue: '#3B82F6',
  /** Dezenter Mono-Lila-Verlauf (liest sich wie eine ruhige Vollfläche). */
  gradient: ['#6C5CFF', '#7A6BFF'] as [string, string],
  success: '#20C978',
  danger: '#FF3B5C',
  /**
   * Lila-Skala (hell → dunkel) für die Map-Pins: Beliebtheit wird NICHT über
   * bunte Kategorie-Farben gezeigt, sondern über Intensität in einem Lila-Ton.
   * Index 0 = wenig beliebt (hell), Index 4 = sehr beliebt (kräftig/dunkel).
   */
  purpleScale: ['#C9C1FF', '#A99CFF', '#8B7BFF', '#6C5CFF', '#4F3FD6'] as const,
  light: {
    /** Sehr helles, neutrales Grau — luftiger Hintergrund. */
    background: '#F7F7F9',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F1F4',
    /** Feine Hairline-Border für Karten. */
    border: '#EAEAEF',
    /** Fast-schwarz für Titel/Primärtext. */
    textPrimary: '#111114',
    textSecondary: '#6B7280',
    textMuted: '#9AA1AE',
    /** Primäre Buttons/CTAs (im Dark-Scheme invertiert). */
    ink: '#111114',
    /** Text/Icons auf `ink`. */
    onInk: '#FFFFFF',
    /** Karten: nahezu deckendes Weiß (clean statt Milchglas). */
    cardGlass: 'rgba(255,255,255,0.94)',
    /** Dezente, dunkle Hairline statt heller Glas-Kante. */
    glassBorder: 'rgba(17,17,20,0.06)',
    /** Keine Glanzkante mehr — flacher, ruhiger Look. */
    glassHighlight: 'transparent',
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
