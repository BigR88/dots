import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { EventPickerSheet } from '@/components/EventPickerSheet';
import { GroupAvatar } from '@/components/friends/GroupAvatar';
import { getEventById } from '@/data/events';
import { useAuth } from '@/hooks/use-auth';
import { canWriteInGroup } from '@/lib/group-perms';
import { formatDateTime } from '@/lib/format';
import { appendToGroupThread, readGroupThread, type GroupChatMessage } from '@/lib/group-chat-store';
import { OWNER_SELF, getGroup } from '@/lib/groups-store';
import { useTheme, type Theme } from '@/theme/theme';

/**
 * Gruppenchat — gemeinsamer Thread einer Gruppe: alle Mitglieder schreiben und
 * teilen Events. Demo-Modus: Nachrichten liegen lokal (AsyncStorage, pro
 * Gruppe). Mit Supabase wird daraus `group_messages` + Realtime; Screen bleibt.
 */
export default function GroupChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = String(id);

  const { session } = useAuth();
  const myId = session?.user?.id ?? OWNER_SELF;
  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });

  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pickEvent, setPickEvent] = useState(false);
  const listRef = useRef<FlatList<GroupChatMessage>>(null);

  useEffect(() => {
    let active = true;
    void readGroupThread(groupId).then((msgs) => {
      if (active) setMessages(msgs);
    });
    return () => {
      active = false;
    };
  }, [groupId]);

  const sendText = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void appendToGroupThread(groupId, { fromMe: true, text }).then(setMessages);
  };

  const shareEvent = (eventId: string) => {
    setPickEvent(false);
    void appendToGroupThread(groupId, { fromMe: true, eventId }).then(setMessages);
  };

  if (isLoading) {
    return <View style={[styles.center, { backgroundColor: t.colors.background }]} />;
  }
  if (!group) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.background }]}>
        <EmptyState icon="people-outline" title="Gruppe nicht gefunden" />
      </View>
    );
  }

  const memberLabel = `${group.memberIds.length + 1} ${group.memberIds.length + 1 === 1 ? 'Mitglied' : 'Mitglieder'}`;
  const canWrite = canWriteInGroup(group, myId);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: t.colors.background }]}>
      {/* Header — Tippen auf Bild/Name öffnet die Gruppen-Details */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: t.colors.border }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/friends'))}
          hitSlop={8}
          accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={() => router.push(`/group-details/${groupId}`)}
          accessibilityLabel="Gruppen-Details öffnen"
          style={styles.headerInfo}>
          <GroupAvatar name={group.name} uri={group.avatarUri} size={36} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.headerName, { color: t.colors.textPrimary }]}>
              {group.name}
            </Text>
            <Text numberOfLines={1} style={[styles.headerSub, { color: t.colors.textMuted }]}>
              {memberLabel} · Details ansehen
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => <MessageRow msg={item} theme={t} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="chatbubbles-outline"
              title={`Startet den Chat von „${group.name}"`}
              subtitle="Schreibt zusammen und teilt Events, zu denen ihr gemeinsam gehen wollt."
            />
          </View>
        }
        contentContainerStyle={[styles.listContent, messages.length === 0 && styles.emptyGrow]}
      />

      {/* Eingabe — nur wenn die Person schreiben darf */}
      {canWrite ? (
        <View style={[styles.inputRow, { paddingBottom: insets.bottom + 10, borderTopColor: t.colors.border }]}>
          <Pressable
            onPress={() => setPickEvent(true)}
            accessibilityLabel="Event teilen"
            style={[styles.attachBtn, { backgroundColor: t.colors.surfaceElevated }]}>
            <Ionicons name="add" size={24} color={t.accent} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Nachricht …"
            placeholderTextColor={t.colors.textMuted}
            style={[
              styles.input,
              { color: t.colors.textPrimary, backgroundColor: t.colors.surface, borderColor: t.colors.border },
            ]}
            onSubmitEditing={sendText}
            returnKeyType="send"
          />
          <Pressable
            onPress={sendText}
            accessibilityLabel="Senden"
            style={[styles.sendBtn, { backgroundColor: draft.trim() ? t.accent : t.colors.surfaceElevated }]}>
            <Ionicons name="arrow-up" size={20} color={draft.trim() ? '#fff' : t.colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.lockRow, { paddingBottom: insets.bottom + 10, borderTopColor: t.colors.border }]}>
          <Ionicons name="lock-closed-outline" size={16} color={t.colors.textMuted} />
          <Text style={[styles.lockText, { color: t.colors.textMuted }]}>
            Nur Admins dürfen in dieser Gruppe schreiben.
          </Text>
        </View>
      )}

      <EventPickerSheet visible={pickEvent} onClose={() => setPickEvent(false)} onPick={shareEvent} />
    </KeyboardAvoidingView>
  );
}

/** Eine Nachricht: Text-Bubble oder geteiltes Event; fremde Absender mit Label. */
function MessageRow({ msg, theme: t }: { msg: GroupChatMessage; theme: Theme }) {
  if (msg.eventId) return <EventBubble eventId={msg.eventId} fromMe={msg.fromMe} theme={t} />;

  return (
    <View style={msg.fromMe ? styles.alignEnd : styles.alignStart}>
      {!msg.fromMe && msg.senderName ? (
        <Text style={[styles.sender, { color: msg.senderColor ?? t.colors.textSecondary }]}>{msg.senderName}</Text>
      ) : null}
      <View
        style={[
          styles.bubble,
          msg.fromMe
            ? [styles.bubbleMe, { backgroundColor: t.accent }]
            : [styles.bubbleThem, { backgroundColor: t.colors.surface, borderColor: t.colors.border }],
        ]}>
        <Text style={[styles.bubbleText, { color: msg.fromMe ? '#fff' : t.colors.textPrimary }]}>{msg.text}</Text>
      </View>
    </View>
  );
}

/** Geteiltes Event als antippbare Karte im Chat. */
function EventBubble({ eventId, fromMe, theme: t }: { eventId: string; fromMe: boolean; theme: Theme }) {
  const router = useRouter();
  const { data: event } = useQuery({ queryKey: ['event', eventId], queryFn: () => getEventById(eventId) });
  if (!event) return null;
  const accent = event.category?.color ?? t.accent;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={[
        styles.eventBubble,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border },
        fromMe ? styles.bubbleMe : styles.bubbleThem,
      ]}>
      <View style={[styles.eventIcon, { backgroundColor: `${accent}26` }]}>
        <Ionicons name={(event.category?.icon ?? 'sparkles') as never} size={20} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={[styles.eventTitle, { color: t.colors.textPrimary }]}>
          {event.title}
        </Text>
        <Text numberOfLines={1} style={[styles.eventMeta, { color: t.colors.textSecondary }]}>
          {formatDateTime(event.startAt)} · {event.venue?.name ?? 'Frankfurt'}
        </Text>
        <Text style={[styles.eventLink, { color: t.accent }]}>Event ansehen →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 11.5 },
  listContent: { padding: 16, gap: 8 },
  emptyGrow: { flexGrow: 1, justifyContent: 'center' },
  emptyWrap: { paddingHorizontal: 8 },
  alignEnd: { alignSelf: 'flex-end', maxWidth: '80%', alignItems: 'flex-end' },
  alignStart: { alignSelf: 'flex-start', maxWidth: '80%', alignItems: 'flex-start' },
  sender: { fontSize: 11.5, fontWeight: '700', marginBottom: 2, marginLeft: 6 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  eventBubble: {
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  eventIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 14.5, fontWeight: '800' },
  eventMeta: { fontSize: 12.5, marginTop: 1 },
  eventLink: { fontSize: 12.5, fontWeight: '700', marginTop: 3 },
  bubbleMe: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  bubbleText: { fontSize: 15.5, lineHeight: 21 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15.5 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lockText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
