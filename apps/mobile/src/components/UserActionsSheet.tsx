import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { blockUser, reportUser } from '@/data/safety';
import { palette, useTheme } from '@/theme/theme';
import { GlassView } from './GlassView';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Profil-ID der betroffenen Person. */
  userId: string;
  userName: string;
  /** Nach erfolgreicher Blockierung (z. B. zurück zur Freundesliste). */
  onBlocked?: () => void;
}

const REPORT_REASONS = [
  'Spam',
  'Belästigung oder Mobbing',
  'Unangemessene Inhalte',
  'Fake-Profil',
  'Sonstiges',
];

type Step = 'menu' | 'report' | 'reportDone' | 'block';

/**
 * Aktionen zu einer anderen Person: Melden & Blockieren (App-Store-Pflicht bei
 * Nutzer-Inhalten, Apple 1.2). Erreichbar aus Chat und Freundes-Profil.
 * Inline-Overlay statt RN-<Modal>/Alert — läuft so auf Web und Native gleich
 * (Muster wie FriendPickerModal).
 */
export function UserActionsSheet({ visible, onClose, userId, userName, onBlocked }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const close = () => {
    if (busy) return;
    setStep('menu');
    setError(null);
    onClose();
  };

  const submitReport = async (reason: string) => {
    setBusy(true);
    setError(null);
    try {
      await reportUser(userId, reason);
      setStep('reportDone');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Meldung fehlgeschlagen. Versuch es später erneut.');
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    setBusy(true);
    setError(null);
    try {
      await blockUser(userId);
      // Blockieren entfernt die Freundschaft → Listen/Suche neu laden.
      void qc.invalidateQueries({ queryKey: ['friend-overview'] });
      void qc.invalidateQueries({ queryKey: ['friends-attendance'] });
      void qc.invalidateQueries({ queryKey: ['user-search'] });
      setBusy(false);
      setStep('menu');
      onClose();
      onBlocked?.();
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : 'Blockieren fehlgeschlagen. Versuch es später erneut.');
    }
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />

        {step === 'menu' && (
          <>
            <Text style={[styles.title, { color: t.colors.textPrimary }]}>{userName}</Text>
            <Pressable
              onPress={() => setStep('report')}
              style={({ pressed }) => [styles.row, { borderColor: t.colors.border, opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="flag-outline" size={19} color={t.colors.textPrimary} />
              <Text style={[styles.rowLabel, { color: t.colors.textPrimary }]}>Melden</Text>
              <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => setStep('block')}
              style={({ pressed }) => [styles.row, { borderColor: t.colors.border, opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="hand-left-outline" size={19} color={palette.danger} />
              <Text style={[styles.rowLabel, { color: palette.danger }]}>Blockieren</Text>
              <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
            </Pressable>
          </>
        )}

        {step === 'report' && (
          <>
            <Text style={[styles.title, { color: t.colors.textPrimary }]}>{`${userName} melden`}</Text>
            <Text style={[styles.message, { color: t.colors.textSecondary }]}>
              Warum möchtest du diese Person melden? Deine Meldung ist anonym — wir schauen sie uns an.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {busy ? (
              <ActivityIndicator style={styles.spinner} color={t.accent} />
            ) : (
              REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => void submitReport(reason)}
                  style={({ pressed }) => [styles.row, { borderColor: t.colors.border, opacity: pressed ? 0.6 : 1 }]}>
                  <Text style={[styles.rowLabel, { color: t.colors.textPrimary }]}>{reason}</Text>
                  <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
                </Pressable>
              ))
            )}
          </>
        )}

        {step === 'reportDone' && (
          <>
            <Text style={[styles.title, { color: t.colors.textPrimary }]}>Danke für deine Meldung</Text>
            <Text style={[styles.message, { color: t.colors.textSecondary }]}>
              Wir prüfen den Hinweis so schnell wie möglich. Wenn du nichts mehr von dieser Person
              hören möchtest, kannst du sie zusätzlich blockieren.
            </Text>
            <Pressable
              onPress={() => setStep('block')}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: palette.danger, opacity: pressed ? 0.75 : 1 },
              ]}>
              <Text style={styles.confirmText}>Blockieren</Text>
            </Pressable>
          </>
        )}

        {step === 'block' && (
          <>
            <Text style={[styles.title, { color: t.colors.textPrimary }]}>{`${userName} blockieren?`}</Text>
            <Text style={[styles.message, { color: t.colors.textSecondary }]}>
              Ihr könnt euch nicht mehr schreiben oder gegenseitig finden; eine bestehende
              Freundschaft wird entfernt. Blockierte Personen erfahren nichts davon.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              onPress={() => void submitBlock()}
              disabled={busy}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: palette.danger, opacity: pressed || busy ? 0.75 : 1 },
              ]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Blockieren</Text>}
            </Pressable>
          </>
        )}

        <Pressable onPress={close} disabled={busy} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: t.colors.textSecondary }]}>
            {step === 'reportDone' ? 'Fertig' : 'Abbrechen'}
          </Text>
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
  message: { fontSize: 14, lineHeight: 20, marginBottom: 10 },
  error: { fontSize: 13, lineHeight: 18, marginBottom: 8, color: palette.danger, fontWeight: '600' },
  spinner: { paddingVertical: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15.5, fontWeight: '700' },
  confirmBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13, marginTop: 4 },
  confirmText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
