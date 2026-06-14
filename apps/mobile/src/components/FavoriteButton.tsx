import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { palette } from '@dots/shared';
import { toggleFavorite, useIsFavorite } from '@/hooks/use-favorites';
import { useTheme } from '@/theme/theme';

interface Props {
  eventId: string;
  size?: number;
  /** 'float' = weißer Kreis (über Covern), 'plain' = nur das Icon (Listen). */
  variant?: 'float' | 'plain';
}

/** Herz-Toggle — stoppt die Touch-Propagation, damit die Karte nicht öffnet. */
export function FavoriteButton({ eventId, size = 20, variant = 'float' }: Props) {
  const t = useTheme();
  const isFav = useIsFavorite(eventId);

  const icon = (
    <Ionicons
      name={isFav ? 'heart' : 'heart-outline'}
      size={size}
      color={isFav ? palette.danger : variant === 'plain' ? t.colors.textMuted : t.colors.textPrimary}
    />
  );

  const onPress = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    toggleFavorite(eventId);
  };

  if (variant === 'plain') {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityLabel={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
        {icon}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      style={[
        styles.float,
        {
          backgroundColor: t.colors.background,
          borderColor: t.colors.border,
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
        },
      ]}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  float: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
