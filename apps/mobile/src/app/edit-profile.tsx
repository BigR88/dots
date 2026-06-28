import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { SectionLabel } from '@/components/profile/SectionLabel';
import { UsernameField, type UsernameStatus } from '@/components/profile/UsernameField';
import { checkUsernameAvailable } from '@/data/profile';
import { useAuth } from '@/hooks/use-auth';
import { useMyProfile, useUpdateProfile } from '@/hooks/use-profile';
import { normalizeUsername, suggestUsername, usernameError } from '@/lib/username';
import { useTheme } from '@/theme/theme';

const BIO_MAX = 160;

export default function EditProfileScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { displayName, email } = useAuth();
  const profile = useMyProfile();
  const update = useUpdateProfile();

  const savedUsername = profile.data?.username ?? null;
  const initialName = profile.data?.displayName ?? displayName ?? '';

  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [homeArea, setHomeArea] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Formular einmalig aus dem geladenen Profil befüllen.
  useEffect(() => {
    if (hydrated || profile.isLoading) return;
    setName(profile.data?.displayName ?? displayName ?? '');
    setUsername(profile.data?.username ?? suggestUsername(displayName, email));
    setBio(profile.data?.bio ?? '');
    setInterests(profile.data?.interests ?? []);
    setHomeArea(profile.data?.homeArea ?? '');
    setHydrated(true);
  }, [profile.isLoading, profile.data, displayName, email, hydrated]);

  // Username live prüfen (Format + Verfügbarkeit, leicht entprellt).
  const [uStatus, setUStatus] = useState<UsernameStatus>('idle');
  const [uMsg, setUMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (username === savedUsername) {
      setUStatus('idle');
      setUMsg('Das ist dein aktueller Benutzername.');
      return;
    }
    const err = usernameError(username);
    if (err) {
      setUStatus('invalid');
      setUMsg(err);
      return;
    }
    setUStatus('checking');
    setUMsg('Verfügbarkeit wird geprüft …');
    let cancelled = false;
    const handle = setTimeout(async () => {
      const avail = await checkUsernameAvailable(username);
      if (cancelled) return;
      if (avail === null) {
        setUStatus('idle');
        setUMsg('Wird beim Speichern endgültig geprüft.');
      } else if (avail) {
        setUStatus('available');
        setUMsg(`@${username} ist frei`);
      } else {
        setUStatus('taken');
        setUMsg('Dieser Benutzername ist schon vergeben.');
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [username, savedUsername, hydrated]);

  const canSave = useMemo(
    () => name.trim().length > 0 && uStatus !== 'invalid' && uStatus !== 'taken' && uStatus !== 'checking',
    [name, uStatus],
  );

  const onSave = async () => {
    setSaveError(null);
    try {
      await update.mutateAsync({
        displayName: name.trim(),
        username: username !== savedUsername ? username : undefined,
        bio: bio.trim() || null,
        interests,
        homeArea: homeArea.trim() || null,
      });
      if (router.canGoBack()) router.back();
      else router.replace('/profile');
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '';
      if (/duplicate|unique|23505/i.test(msg)) {
        setUStatus('taken');
        setUMsg('Dieser Benutzername ist schon vergeben.');
      } else if (/column|schema|does not exist/i.test(msg)) {
        setSaveError('Profil-Felder sind noch nicht in der Datenbank. Bitte Migration 0005 einspielen.');
      } else {
        setSaveError(msg || 'Speichern fehlgeschlagen. Bitte erneut versuchen.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: t.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: t.colors.border }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} hitSlop={8} accessibilityLabel="Abbrechen">
          <Ionicons name="close" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.colors.textPrimary }]}>Profil bearbeiten</Text>
        <Pressable onPress={onSave} disabled={!canSave || update.isPending} hitSlop={8} accessibilityLabel="Speichern">
          {update.isPending ? (
            <ActivityIndicator size="small" color={t.accent} />
          ) : (
            <Text style={[styles.save, { color: canSave ? t.accent : t.colors.textMuted }]}>Sichern</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <AvatarPicker name={name || 'dots'} seed={profile.data?.id ?? name} />
        </View>

        <SectionLabel title="Anzeigename" hint="So wirst du angezeigt — darf mehrfach vorkommen." />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Dein Name"
          placeholderTextColor={t.colors.textMuted}
          style={[styles.input, { backgroundColor: t.colors.surface, borderColor: t.colors.border, color: t.colors.textPrimary }]}
        />

        <View style={styles.gap} />
        <SectionLabel title="Benutzername" hint="Eindeutig — so finden dich Freunde über @username." />
        <UsernameField
          value={username}
          onChangeText={(v) => setUsername(normalizeUsername(v))}
          status={uStatus}
          message={uMsg}
        />

        <View style={styles.gap} />
        <SectionLabel title="Bio" hint={`Kurz & knackig · ${bio.length}/${BIO_MAX}`} />
        <TextInput
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
          placeholder="Worauf hast du Lust? Was ist dein Vibe?"
          placeholderTextColor={t.colors.textMuted}
          multiline
          style={[styles.input, styles.bio, { backgroundColor: t.colors.surface, borderColor: t.colors.border, color: t.colors.textPrimary }]}
        />

        <View style={styles.gap} />
        <SectionLabel title="Bereich" hint="Wo bist du am liebsten unterwegs?" />
        <TextInput
          value={homeArea}
          onChangeText={setHomeArea}
          placeholder="z. B. Sachsenhausen, Innenstadt"
          placeholderTextColor={t.colors.textMuted}
          style={[styles.input, { backgroundColor: t.colors.surface, borderColor: t.colors.border, color: t.colors.textPrimary }]}
        />

        {saveError ? (
          <Text style={[styles.error, { color: '#FF3B5C' }]}>{saveError}</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  save: { fontSize: 16, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 18 },
  avatarWrap: { alignItems: 'center', marginBottom: 22 },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15.5,
  },
  bio: { minHeight: 80, textAlignVertical: 'top' },
  gap: { height: 20 },
  error: { fontSize: 13, marginTop: 16, lineHeight: 18 },
});
