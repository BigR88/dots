import { colorsFor, palette, radius, spacing, fontSize } from '@dots/shared';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: ReturnType<typeof colorsFor>;
  accent: string;
  /** Zweitfarbe (Blau) für Akzente/Verläufe. */
  accentBlue: string;
  /** Marken-Verlauf (Violett → Blau) für primäre Aktionen. */
  gradient: [string, string];
  radius: typeof radius;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
}

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    scheme,
    colors: colorsFor(scheme),
    accent: palette.accent,
    accentBlue: palette.accentBlue,
    gradient: palette.gradient,
    radius,
    spacing,
    fontSize,
  };
}

export { palette, radius, spacing, fontSize };
