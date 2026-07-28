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
import { LegalPage } from '@/components/LegalPage';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PulsingDotsBackground } from '@/components/PulsingDotsBackground';
import { useAuth } from '@/hooks/use-auth';
import { IMPRINT, PRIVACY, TERMS, type LegalDoc } from '@/lib/legal';
import { palette, useTheme } from '@/theme/theme';

type Mode = 'signin' | 'signup' | 'signupCode' | 'reset' | 'resetCode';

/**
 * Start-/Anmeldeseite (Auth-Gate) — Instagram-orientiert: zentrierte Wortmarke,
 * ruhige Felder, eine kräftige Lila-Aktion. Ohne gültige Session sieht der
 * Nutzer nur diesen Screen; nach Login/Registrierung übernimmt das Root-Layout.
 *
 * Enthält außerdem: „Passwort vergessen" (6-stelliger Code per Mail, ohne Deep
 * Links), „Ohne Konto entdecken" (Gast-Modus, Apple 5.1.1(ii)) und die
 * Rechtstexte als Overlay (der Screen lebt außerhalb des Routers).
 */
export function AuthScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, continueAsGuest, confirmSignUp, resetPassword, confirmPasswordReset } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

  const isSignup = mode === 'signup';
  const isSignupCode = mode === 'signupCode';
  const isReset = mode === 'reset' || mode === 'resetCode';
  const ident = email.trim();
  const isRealEmail = /.+@.+\..+/.test(ident);
  // Registrierung und Passwort-Reset brauchen eine ECHTE E-Mail (Bestätigungs-
  // Code geht sonst ins Leere). Nur beim Anmelden bleibt der Namens-Kurzweg
  // ("yannik" → yannik@dots.app) für bestehende Konten erhalten.
  const needsRealEmail = isSignup || isSignupCode || isReset;
  const identOk =
    needsRealEmail || ident.includes('@')
      ? isRealEmail
      : ident.length >= 2 && !/\s/.test(ident);

  const passwordsMatch = password === password2;
  const canSubmit =
    !busy &&
    identOk &&
    (mode === 'reset'
      ? true
      : isSignupCode
        ? code.trim().length >= 6
        : password.length >= 6 &&
          (!isSignup || (name.trim().length >= 2 && passwordsMatch)) &&
          (mode !== 'resetCode' || code.trim().length >= 6));

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

    if (mode === 'reset') {
      const res = await resetPassword(email);
      setBusy(false);
      if (res.error) {
        setError(translateError(res.error));
        return;
      }
      setMode('resetCode');
      setPassword('');
      setCode('');
      setInfo('Wir haben dir eine E-Mail mit einem 6-stelligen Code geschickt. Gib ihn hier ein und wähle ein neues Passwort.');
      return;
    }

    if (mode === 'resetCode') {
      const res = await confirmPasswordReset(email, code, password);
      setBusy(false);
      if (res.error) setError(translateError(res.error));
      // Erfolg: verifyOtp hat angemeldet — das Root-Layout zeigt die App.
      return;
    }

    if (mode === 'signupCode') {
      const res = await confirmSignUp(email, code);
      setBusy(false);
      if (res.error) setError(translateError(res.error));
      // Erfolg: verifyOtp hat angemeldet — das Root-Layout zeigt die App.
      return;
    }

    const res = isSignup ? await signUp(name, email, password) : await signIn(email, password);
    setBusy(false);
    if (res.error) {
      setError(translateError(res.error));
      return;
    }
    if (isSignup && res.needsConfirmation) {
      // Registrierung → E-Mail-Bestätigung per 6-stelligem Code.
      setMode('signupCode');
      setCode('');
      setInfo('Wir haben dir einen 6-stelligen Code per E-Mail geschickt. Gib ihn hier ein, um dein Konto zu bestätigen.');
    }
    // signup ohne needsConfirmation oder signin: Session ist gesetzt → App erscheint.
  };

  const ctaLabel =
    mode === 'signup'
      ? 'Registrieren'
      : mode === 'signupCode'
        ? 'Konto bestätigen'
        : mode === 'reset'
          ? 'Code anfordern'
          : mode === 'resetCode'
            ? 'Passwort ändern'
            : 'Anmelden';

  // Ganz leicht helllila Bühne + pulsierende Marken-Punkte im Hintergrund.
  const stageBg = t.scheme === 'dark' ? '#100C1E' : '#F1EDFF';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: stageBg }]}>
      <PulsingDotsBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Mitte: Marke + Formular */}
        <View style={styles.center}>
          {/* Wortmarke klein („dots.") — wie MapHud und die Tab-Headlines. */}
          <Text style={[styles.brand, { color: t.colors.textPrimary }]}>
            dots<Text style={{ color: t.accent }}>.</Text>
          </Text>
          <Text style={[styles.tagline, { color: t.colors.textMuted }]}>
            Was geht in Frankfurt?
          </Text>

          <View style={styles.form}>
            {isSignup && (
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Benutzername"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username-new"
              />
            )}
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder={needsRealEmail ? 'E-Mail' : 'E-Mail oder Name'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {(mode === 'resetCode' || isSignupCode) && (
              <Input
                value={code}
                onChangeText={setCode}
                placeholder="6-stelliger Code aus der E-Mail"
                keyboardType="number-pad"
                autoCapitalize="none"
                onSubmitEditing={submit}
                returnKeyType="go"
              />
            )}
            {mode !== 'reset' && !isSignupCode && (
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'resetCode' ? 'Neues Passwort' : 'Passwort'}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={isSignup || mode === 'resetCode' ? 'new-password' : 'current-password'}
                onSubmitEditing={isSignup ? undefined : submit}
                returnKeyType={isSignup ? 'next' : 'go'}
              />
            )}
            {isSignup && (
              <Input
                value={password2}
                onChangeText={setPassword2}
                placeholder="Passwort wiederholen"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                onSubmitEditing={submit}
                returnKeyType="go"
              />
            )}

            {isSignup && password2.length > 0 && !passwordsMatch && (
              <View style={styles.msgRow}>
                <Ionicons name="alert-circle" size={15} color={palette.danger} />
                <Text style={[styles.msgText, { color: palette.danger }]}>
                  Die Passwörter stimmen nicht überein.
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.msgRow}>
                <Ionicons name="alert-circle" size={15} color={palette.danger} />
                <Text style={[styles.msgText, { color: palette.danger }]}>{error}</Text>
              </View>
            )}
            {info && (
              <View style={styles.msgRow}>
                <Ionicons name="mail-outline" size={15} color={t.accent} />
                <Text style={[styles.msgText, { color: t.colors.textSecondary }]}>{info}</Text>
              </View>
            )}

            <PrimaryButton
              label={ctaLabel}
              onPress={submit}
              disabled={!canSubmit}
              busy={busy}
              style={styles.cta}
            />

            {mode === 'signin' && (
              <Pressable onPress={() => switchMode('reset')} hitSlop={6} style={styles.forgot}>
                <Text style={[styles.forgotText, { color: t.colors.textSecondary }]}>
                  Passwort vergessen?
                </Text>
              </Pressable>
            )}
            {(isReset || isSignupCode) && (
              <Pressable onPress={() => switchMode('signin')} hitSlop={6} style={styles.forgot}>
                <Text style={[styles.forgotText, { color: t.colors.textSecondary }]}>
                  Zurück zur Anmeldung
                </Text>
              </Pressable>
            )}
          </View>

          {/* Gast-Modus: Events & Karte ohne Konto (Apple 5.1.1(ii)). */}
          {!isReset && !isSignupCode && (
            <Pressable
              onPress={continueAsGuest}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.guestBtn,
                { borderColor: t.colors.border, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Ionicons name="compass-outline" size={17} color={t.colors.textPrimary} />
              <Text style={[styles.guestText, { color: t.colors.textPrimary }]}>
                Ohne Konto entdecken
              </Text>
            </Pressable>
          )}
        </View>

        {/* Unten: Moduswechsel + Rechtliches */}
        <View style={[styles.bottom, { borderTopColor: t.colors.border }]}>
          {!isReset && !isSignupCode && (
            <View style={styles.switchRow}>
              <Text style={[styles.bottomText, { color: t.colors.textSecondary }]}>
                {isSignup ? 'Schon ein Konto? ' : 'Noch kein Konto? '}
              </Text>
              <Pressable onPress={() => switchMode(isSignup ? 'signin' : 'signup')} hitSlop={8}>
                <Text style={[styles.bottomLink, { color: t.accent }]}>
                  {isSignup ? 'Anmelden' : 'Registrieren'}
                </Text>
              </Pressable>
            </View>
          )}
          <Text style={[styles.legalText, { color: t.colors.textMuted }]}>
            Mit der Nutzung von dots akzeptierst du unsere{' '}
            <Text style={[styles.legalLink, { color: t.colors.textSecondary }]} onPress={() => setLegalDoc(TERMS)}>
              Nutzungsregeln
            </Text>{' '}
            und die{' '}
            <Text style={[styles.legalLink, { color: t.colors.textSecondary }]} onPress={() => setLegalDoc(PRIVACY)}>
              Datenschutzerklärung
            </Text>
            . ·{' '}
            <Text style={[styles.legalLink, { color: t.colors.textSecondary }]} onPress={() => setLegalDoc(IMPRINT)}>
              Impressum
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Rechtstexte als Overlay — dieser Screen liegt außerhalb des Routers. */}
      {legalDoc && (
        <View style={StyleSheet.absoluteFill}>
          <LegalPage doc={legalDoc} onBack={() => setLegalDoc(null)} />
        </View>
      )}
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
  // Spezifische Fälle VOR den generischen Substring-Zweigen prüfen.
  if (m.includes('not confirmed'))
    return 'Bitte bestätige zuerst deine E-Mail über den Link in der Mail.';
  if (m.includes('token has expired') || m.includes('otp'))
    return 'Der Code ist falsch oder abgelaufen. Fordere einen neuen an.';
  if (m.includes('different from the old'))
    return 'Das neue Passwort muss sich vom alten unterscheiden.';
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
  forgot: { alignSelf: 'center', paddingVertical: 4, marginTop: 6 },
  forgotText: { fontSize: 13.5, fontWeight: '600' },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  guestText: { fontSize: 14, fontWeight: '700' },
  bottom: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontSize: 14 },
  bottomLink: { fontSize: 14, fontWeight: '700' },
  legalText: { fontSize: 11.5, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },
  legalLink: { fontWeight: '700', textDecorationLine: 'underline' },
});
