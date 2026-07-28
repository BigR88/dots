import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { GlassView } from '@/components/GlassView';
import { SearchBar } from '@/components/friends/SearchBar';
import { useFriendChoices } from '@/hooks/use-friend-choices';
import { useTheme } from '@/theme/theme';

interface Props {
  visible: boolean;
  /** Bereits in der Gruppe — werden ausgeblendet. */
  existingIds: string[];
  onClose: () => void;
  onAdd: (memberIds: string[]) => void;
}

const matches = (name: string, q: string) => name.toLowerCase().includes(q.trim().toLowerCase());

/**
 * Mitglieder hinzufügen: Mehrfachauswahl aus den eigenen Freund:innen, die noch
 * nicht in der Gruppe sind — mit derselben Suchleiste wie im Freunde-Tab.
 */
export function AddMembersSheet({ visible, existingIds, onClose, onAdd }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { friends } = useFriendChoices();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const available = useMemo(
    () => friends.filter((f) => !existingIds.includes(f.id)),
    [friends, existingIds],
  );
  const filtered = useMemo(() => available.filter((f) => matches(f.name, query)), [available, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const close = () => {
    setQuery('');
    setSelected(new Set());
    onClose();
  };

  const submit = () => {
    if (selected.size === 0) return;
    onAdd([...selected]);
    setQuery('');
    setSelected(new Set());
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Schließen" />
      <GlassView intensity={80} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.grabber, { backgroundColor: t.colors.border }]} />
        <View style={styles.head}>
          <Text style={[styles.title, { color: t.colors.textPrimary }]}>Mitglieder hinzufügen</Text>
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

        {available.length === 0 ? (
          <Text style={[styles.empty, { color: t.colors.textSecondary }]}>
            Alle deine Freund:innen sind schon in dieser Gruppe.
          </Text>
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: t.colors.textSecondary }]}>
            Niemand passt zu „{query.trim()}".
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

        {available.length > 0 && (
          <Pressable onPress={submit} disabled={selected.size === 0} accessibilityLabel="Hinzufügen">
            {({ pressed }) => (
              <LinearGradient
                colors={t.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.addBtn, { opacity: selected.size === 0 ? 0.4 : pressed ? 0.9 : 1 }]}>
                <Ionicons name="person-add" size={16} color="#fff" />
                <Text style={styles.addText}>Hinzufügen</Text>
              </LinearGradient>
            )}
          </Pressable>
        )}

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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  count: { fontSize: 13, fontWeight: '800' },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 18 },
  list: { maxHeight: 300, marginTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
  addText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 2 },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
