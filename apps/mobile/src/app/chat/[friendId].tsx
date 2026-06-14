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
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { fetchThread, sendMessage, subscribeThread } from '@/data/chat';
import { getEventById } from '@/data/events';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/hooks/use-auth';
import { appendToThread, readThread, type ChatMessage } from '@/lib/chat-store';
import { formatDateTime } from '@/lib/format';
import { friendById } from '@/lib/social';
import { useTheme, type Theme } from '@/theme/theme';

/**
 * 1:1-Chat — Demo-Modus: Nachrichten liegen lokal (AsyncStorage, pro Freund).
 * Mit Supabase wird daraus die `messages`-Tabelle + Realtime-Subscription;
 * der Screen bleibt gleich.
 */
export default function ChatScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const myId = session?.user?.id ?? null;
  const isLive = isSupabaseConfigured && Boolean(myId);

  const { friendId, name, color } = useLocalSearchParams<{
    friendId: string;
    name?: string;
    color?: string;
  }>();
  // Demo-Freunde kommen aus den Fixtures; echte Freunde reichen Name/Farbe als
  // Route-Parameter durch.
  const demoFriend = friendById(String(friendId));
  const friend =
    demoFriend ??
    (name ? { id: String(friendId), name: String(name), color: String(color ?? '#7A5CFF') } : null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Hängt eine Nachricht an, ohne Duplikate (Realtime + optimistisch).
  const appendUnique = (msg: ChatMessage) =>
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));

  // Thread laden + (live) auf neue Nachrichten hören.
  useEffect(() => {
    let active = true;
    if (isLive && myId) {
      void fetchThread(myId, String(friendId)).then((msgs) => {
        if (active) setMessages(msgs);
      });
      const unsub = subscribeThread(myId, String(friendId), (m) => {
        if (active) appendUnique(m);
      });
      return () => {
        active = false;
        unsub();
      };
    }
    void readThread(String(friendId)).then((msgs) => {
      if (active) setMessages(msgs);
    });
    return () => {
      active = false;
    };
  }, [friendId, isLive, myId]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (isLive && myId) {
      void sendMessage(myId, String(friendId), { text }).then((m) => {
        if (m) appendUnique(m);
      });
    } else {
      void appendToThread(String(friendId), { fromMe: true, text }).then(setMessages);
    }
  };

  if (!friend) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.background }]}>
        <EmptyState icon="person-outline" title="Profil nicht gefunden" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: t.colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, borderBottomColor: t.colors.border },
        ]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/friends'))}
          hitSlop={8}
          accessibilityLabel="Zurück">
          <Ionicons name="chevron-back" size={26} color={t.colors.textPrimary} />
        </Pressable>
        <Avatar name={friend.name} color={friend.color} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: t.colors.textPrimary }]}>{friend.name}</Text>
          <Text style={[styles.headerSub, { color: t.colors.textMuted }]}>
            {isLive ? 'Live · Nachrichten in Echtzeit' : 'Demo-Chat · lokal gespeichert'}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) =>
          item.eventId ? (
            <EventBubble eventId={item.eventId} fromMe={item.fromMe} theme={t} />
          ) : (
            <View
              style={[
                styles.bubble,
                item.fromMe
                  ? [styles.bubbleMe, { backgroundColor: t.accent }]
                  : [styles.bubbleThem, { backgroundColor: t.colors.surface, borderColor: t.colors.border }],
              ]}>
              <Text
                style={[
                  styles.bubbleText,
                  { color: item.fromMe ? '#fff' : t.colors.textPrimary },
                ]}>
                {item.text}
              </Text>
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="chatbubbles-outline"
              title={`Sag hallo zu ${friend.name}!`}
              subtitle="Schick eine Nachricht — z. B. welches Event ihr zusammen besucht."
            />
          </View>
        }
        contentContainerStyle={[styles.listContent, messages.length === 0 && styles.emptyGrow]}
      />

      {/* Eingabe */}
      <View
        style={[
          styles.inputRow,
          { paddingBottom: insets.bottom + 10, borderTopColor: t.colors.border },
        ]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Nachricht …"
          placeholderTextColor={t.colors.textMuted}
          style={[
            styles.input,
            { color: t.colors.textPrimary, backgroundColor: t.colors.surface, borderColor: t.colors.border },
          ]}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable
          onPress={send}
          accessibilityLabel="Senden"
          style={[styles.sendBtn, { backgroundColor: draft.trim() ? t.accent : t.colors.surfaceElevated }]}>
          <Ionicons name="arrow-up" size={20} color={draft.trim() ? '#fff' : t.colors.textMuted} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Geteiltes Event als antippbare Karte im Chat. */
function EventBubble({ eventId, fromMe, theme: t }: { eventId: string; fromMe: boolean; theme: Theme }) {
  const router = useRouter();
  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
  });
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
  headerName: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 11.5 },
  listContent: { padding: 16, gap: 8 },
  emptyGrow: { flexGrow: 1, justifyContent: 'center' },
  emptyWrap: { paddingHorizontal: 8 },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
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
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15.5,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
