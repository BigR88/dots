import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/theme/theme';

type Mode = 'signin' | 'signup';

/**
 * Start-/Anmeldeseite (Auth-Gate) — Instagram-orientiert: zentrierte Wortmarke,
 * ruhige Felder, eine kräftige Lila-Aktion. Ohne gültige Session sieht der
 * Nutzer nur diesen Screen; nach Login/Registrierung übernimmt das Root-Layout.
 */
export function AuthScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const emailOk = /.+@.+\..+/.test(email.trim());
  const canSubmit =
    emailOk && password.length >= 6 && (!isSignup || name.trim().length >= 2) && !busy;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = isSignup ? await signUp(name, email, password) : await signIn(email, password);
    setBusy(false);
    if (res.error) {
      setError(translateError(res.error));
    } else if (res.needsConfirmation) {
      setInfo('Fast geschafft! Bestätige deine E-Mail über den Link, den wir dir geschickt haben — danach kannst du dich anmelden.');
      setMode('signin');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: t.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Mitte: Marke + Formular */}
        <View style={styles.center}>
          <Text style={[styles.brand, { color: t.colors.textPrimary }]}>
            dots<Text style={{ color: t.accent }}>.</Text>
          </Text>
          <Text style={[styles.tagline, { color: t.colors.textMuted }]}>
            Was geht in Frankfurt
          </Text>

          <View style={styles.form}>
            {isSignup && (
              <Input value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" />
            )}
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="E-Mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Passwort"
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {error && (
              <View style={styles.msgRow}>
                <Ionicons name="alert-circle" size={15} color="#E5484D" />
                <Text style={[styles.msgText, { color: '#E5484D' }]}>{error}</Text>
              </View>
            )}
            {info && (
              <View style={styles.msgRow}>
                <Ionicons name="mail-outline" size={15} color={t.accent} />
                <Text style={[styles.msgText, { color: t.colors.textSecondary }]}>{info}</Text>
              </View>
            )}

            <PrimaryButton
              label={isSignup ? 'Registrieren' : 'Anmelden'}
              onPress={submit}
              disabled={!canSubmit}
              busy={busy}
              style={styles.cta}
            />
          </View>
        </View>

        {/* Unten: Wechsel zwischen Anmelden / Registrieren */}
        <View style={[styles.bottom, { borderTopColor: t.colors.border }]}>
          <Text style={[styles.bottomText, { color: t.colors.textSecondary }]}>
            {isSignup ? 'Schon ein Konto? ' : 'Noch kein Konto? '}
          </Text>
          <Pressable onPress={() => switchMode(isSignup ? 'signin' : 'signup')} hitSlop={8}>
            <Text style={[styles.bottomLink, { color: t.accent }]}>
              {isSignup ? 'Anmelden' : 'Registrieren'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.colors.textMuted}
      style={[styles.input, { color: t.colors.textPrimary, backgroundColor: t.colors.surface }]}
      {...props}
    />
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-Mail oder Passwort ist falsch.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Für diese E-Mail gibt es schon ein Konto. Melde dich an.';
  if (m.includes('password')) return 'Passwort zu kurz (mindestens 6 Zeichen).';
  if (m.includes('email')) return 'Bitte eine gültige E-Mail-Adresse eingeben.';
  return msg;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 32 },
  center: { flex: 1, justifyContent: 'center' },
  brand: { fontSize: 46, fontWeight: '900', letterSpacing: -1.5, textAlign: 'center' },
  tagline: { fontSize: 14, textAlign: 'center', marginTop: 2, marginBottom: 36 },
  form: { gap: 11 },
  // outlineWidth: 0 entfernt den Browser-Fokusring in der Web-Vorschau.
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 15, fontSize: 15, outlineWidth: 0 },
  msgRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2, marginTop: 2 },
  msgText: { fontSize: 13, flex: 1, lineHeight: 18 },
  cta: { marginTop: 6 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomText: { fontSize: 14 },
  bottomLink: { fontSize: 14, fontWeight: '700' },
});
