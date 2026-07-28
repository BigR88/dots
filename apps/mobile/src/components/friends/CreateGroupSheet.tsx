import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { GlassView } from '@/components/GlassView';
import { SearchBar } from '@/components/friends/SearchBar';
import { useFriendChoices } from '@/hooks/use-friend-choices';
import { useTheme } from '@/theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}

const matches = (name: string, q: string) => name.toLowerCase().includes(q.trim().toLowerCase());

/**
 * „Gruppe erstellen": Name + Mehrfachauswahl von Mitgliedern. Auswählbar sind
 * ausschließlich eigene Freund:innen (Liste kommt aus useFriendChoices) — mit
 * derselben Suchleiste wie im Freunde-Tab. Inline-Overlay wie FriendPickerModal
 * (kein RN-<Modal>, damit es im Vorschau-Rahmen bleibt).
 */
export function CreateGroupSheet({ visible, onClose, onCreate }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { friends } = useFriendChoices();

  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => friends.filter((f) => matches(f.name, query)), [friends, query]);
  const canCreate = name.trim().length > 0 && selected.size > 0;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const reset = () => {
    setName('');
    setQuery('');
    setSelected(new Set());
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!canCreate) return;
    onCreate(name.trim(), [...selected]);
    reset();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />
        <Text style={[styles.title, { color: t.colors.textPrimary }]}>Gruppe erstellen</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Gruppenname"
          placeholderTextColor={t.colors.textMuted}
          returnKeyType="done"
          style={[
            styles.nameInput,
            { backgroundColor: t.colors.surface, borderColor: t.colors.border, color: t.colors.textPrimary },
          ]}
        />

        <View style={styles.pickerHeader}>
          <Text style={[styles.pickerTitle, { color: t.colors.textSecondary }]}>Freunde hinzufügen</Text>
          {selected.size > 0 && (
            <Text style={[styles.count, { color: t.accent }]}>{selected.size} ausgewählt</Text>
          )}
        </View>

        <SearchBar
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Freunde suchen"
        />

        {friends.length === 0 ? (
          <Text style={[styles.empty, { color: t.colors.textSecondary }]}>
            Du hast noch keine Freund:innen. Füge im Freunde-Tab welche hinzu, um eine Gruppe zu erstellen.
          </Text>
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: t.colors.textSecondary }]}>
            Niemand in deiner Liste heißt „{query.trim()}".
          </Text>
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map((f) => {
              const on = selected.has(f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toggle(f.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={f.name}
                  style={[styles.row, { borderColor: t.colors.border }]}>
                  <Avatar name={f.name} color={f.color} size={36} />
                  <Text style={[styles.name, { color: t.colors.textPrimary }]}>{f.name}</Text>
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={on ? t.accent : t.colors.textMuted}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Pressable onPress={submit} disabled={!canCreate} accessibilityLabel="Gruppe erstellen">
          {({ pressed }) => (
            <LinearGradient
              colors={t.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.createBtn, { opacity: !canCreate ? 0.4 : pressed ? 0.9 : 1 }]}>
              <Ionicons name="people" size={17} color="#fff" />
              <Text style={styles.createText}>Gruppe erstellen</Text>
            </LinearGradient>
          )}
        </Pressable>

        <Pressable onPress={close} style={styles.cancel}>
          <Text style={[styles.cancelText, { color: t.colors.textSecondary }]}>Abbrechen</Text>
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
  title: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  nameInput: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15.5,
    marginBottom: 14,
  },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pickerTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  count: { fontSize: 13, fontWeight: '800' },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 16 },
  list: { maxHeight: 260, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  createText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
