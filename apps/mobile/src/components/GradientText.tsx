import { Platform, Text, type TextStyle } from 'react-native';
import { useTheme } from '@/theme/theme';

interface Props {
  children: string;
  style?: TextStyle | TextStyle[];
  /** Verlaufsfarben (Default = Marken-Verlauf). */
  colors?: [string, string];
}

/**
 * „Knallige" Wortmarke/Überschrift im Marken-Verlauf. Im Web (unsere PWA) echtes
 * Gradient-Text via CSS background-clip; auf nativen Plattformen Fallback auf die
 * Akzentfarbe (Gradient-Text bräuchte dort MaskedView — bewusst nicht abhängig).
 */
export function GradientText({ children, style, colors }: Props) {
  const t = useTheme();
  const [c1, c2] = colors ?? t.gradient;

  if (Platform.OS === 'web') {
    const webStyle = {
      backgroundImage: `linear-gradient(100deg, ${c1}, ${c2})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
    } as unknown as TextStyle;
    return <Text style={[style, webStyle]}>{children}</Text>;
  }

  return <Text style={[style, { color: c1 }]}>{children}</Text>;
}
