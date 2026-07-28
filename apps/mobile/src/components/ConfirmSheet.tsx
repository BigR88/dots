import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, useTheme } from '@/theme/theme';
import { GlassView } from './GlassView';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  /** Beschriftung des (roten) Bestätigen-Buttons. */
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Bestätigungs-Sheet für gefährliche Aktionen (z. B. Konto löschen).
 * Bewusst kein RN-<Modal> und kein Alert: beides funktioniert im Web nicht
 * bzw. bricht aus dem Vorschau-Rahmen aus — als Inline-Overlay (Muster wie
 * FriendPickerModal) läuft es auf allen Plattformen gleich.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  busy,
  error,
  onConfirm,
  onClose,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.message, { color: t.colors.textSecondary }]}>{message}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          accessibilityLabel={confirmLabel}
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: palette.danger, opacity: pressed || busy ? 0.75 : 1 },
          ]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          )}
        </Pressable>
        <Pressable onPress={onClose} disabled={busy} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: t.colors.textSecondary }]}>{cancelLabel}</Text>
        </Pressable>
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  error: { fontSize: 13, lineHeight: 18, marginBottom: 10, color: palette.danger, fontWeight: '600' },
  confirmBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13 },
  confirmText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
