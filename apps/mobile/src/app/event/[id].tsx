import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DotsEvent } from '@dots/shared';
import { palette } from '@dots/shared';
import { AttendBar } from '@/components/AttendBar';
import { EmptyState } from '@/components/EmptyState';
import { EventHero } from '@/components/EventHero';
import { FriendPickerModal } from '@/components/FriendPickerModal';
import { GlassButton } from '@/components/GlassButton';
import { GlassCard } from '@/components/GlassCard';
import { InfoRow } from '@/components/InfoRow';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { sendMessage } from '@/data/chat';
import { getEventById } from '@/data/events';
import { logEventClick } from '@/data/social';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/hooks/use-auth';
import { appendToThread } from '@/lib/chat-store';
import { hexA } from '@/lib/color';
import { formatDateTime, formatPrice, isFree } from '@/lib/format';
import { useTheme } from '@/theme/theme';

function primaryCta(e: DotsEvent): { label: string; url: string } | null {
  if (e.ticketUrl) return { label: 'Tickets ansehen', url: e.ticketUrl };
  if (e.externalUrl) return { label: 'Zur Eventseite', url: e.externalUrl };
  if (e.venue?.websiteUrl) return { label: 'Zur Venue-Website', url: e.venue.websiteUrl };
  if (e.venue?.instagram) return { label: 'Auf Instagram', url: `https://instagram.com/${e.venue.instagram}` };
  return null;
}

export default function EventDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showFriendPicker, setShowFriendPicker] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(String(id)),
    enabled: Boolean(id),
  });

  // Detail-Aufruf als Trend-Signal loggen (einmal pro geöffnetem Event).
  useEffect(() => {
    if (id) void logEventClick(session?.user?.id ?? null, String(id));
  }, [id, session?.user?.id]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.background }]}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: t.colors.background }]}>
        <EmptyState icon="alert-circle-outline" title="Event nicht gefunden" />
      </View>
    );
  }

  const color = event.category?.color ?? t.accent;
  const free = isFree(event);
  const cta = primaryCta(event);
  const openCta = () => cta && WebBrowser.openBrowserAsync(cta.url);
  const openMaps = () => {
    const q = encodeURIComponent(`${event.venue?.name ?? ''} ${event.venue?.address ?? 'Frankfurt'}`);
    Linking.openURL(`https://maps.apple.com/?q=${q}`);
  };
  const onShare = () =>
    Share.share({ message: `${event.title} — ${formatDateTime(event.startAt)} · ${event.venue?.name ?? 'Frankfurt'} (via dots)` });

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}>
        <EventHero
          color={color}
          icon={event.category?.icon ?? 'sparkles'}
          coverImageUrl={event.coverImageUrl}
          eventId={event.id}
          topInset={insets.top}
          onClose={goBack}
        />

        <View style={styles.body}>
          {/* Kategorie + Preis als Pills */}
          <View style={styles.pillRow}>
            {event.category && (
              <View style={[styles.pill, { backgroundColor: hexA(color, 0.14) }]}>
                <Ionicons name={(event.category.icon ?? 'sparkles') as never} size={13} color={color} />
                <Text style={[styles.pillText, { color }]}>{event.category.name}</Text>
              </View>
            )}
            <View
              style={[
                styles.pill,
                { backgroundColor: free ? hexA(palette.success, 0.16) : t.colors.surfaceElevated },
              ]}>
              <Text style={[styles.pillText, { color: free ? palette.success : t.colors.textPrimary }]}>
                {formatPrice(event)}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: t.colors.textPrimary }]}>{event.title}</Text>

          <AttendBar event={event} />

          {/* Info-Karte */}
          <GlassCard style={styles.infoCard}>
            <InfoRow icon="time-outline">
              {formatDateTime(event.startAt)}
              {event.endAt ? ` – ${formatDateTime(event.endAt)}` : ''}
            </InfoRow>
            <InfoRow icon="location-outline" onPress={openMaps}>
              {event.venue?.name ?? 'Frankfurt am Main'}
              {event.venue?.address ? `, ${event.venue.address}` : ''}
            </InfoRow>
            {event.ageRestriction != null && (
              <InfoRow icon="person-outline">Ab {event.ageRestriction} Jahren</InfoRow>
            )}
            {event.musicGenre && <InfoRow icon="musical-notes-outline">{event.musicGenre}</InfoRow>}
          </GlassCard>

          {event.description && (
            <Text style={[styles.desc, { color: t.colors.textPrimary }]}>{event.description}</Text>
          )}

          {event.vibeTags.length > 0 && (
            <View style={styles.tags}>
              {event.vibeTags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: t.colors.cardGlass, borderColor: t.colors.glassBorder }]}>
                  <Text style={[styles.tagText, { color: t.colors.textSecondary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {event.sourceUrl && (
            <Text style={[styles.source, { color: t.colors.textMuted }]}>Quelle: {event.sourceUrl}</Text>
          )}
        </View>
      </ScrollView>

      {/* Sticky Glas-Action-Bar */}
      <View style={[styles.footerWrap, { paddingBottom: insets.bottom + 10 }]} pointerEvents="box-none">
        <GlassCard intensity={50} radius={26} style={styles.footer}>
          <GlassButton icon="share-outline" onPress={onShare} size={48} accessibilityLabel="Teilen" />
          <GlassButton
            icon="paper-plane-outline"
            onPress={() => setShowFriendPicker(true)}
            size={48}
            accessibilityLabel="An Freund:in senden"
          />
          {cta ? (
            <PrimaryButton label={cta.label} rightIcon="open-outline" onPress={openCta} style={styles.cta} />
          ) : (
            <View style={[styles.cta, styles.ctaEmpty, { backgroundColor: t.colors.surfaceElevated }]}>
              <Text style={[styles.ctaText, { color: t.colors.textSecondary }]}>Kein externer Link</Text>
            </View>
          )}
        </GlassCard>
      </View>

      <FriendPickerModal
        visible={showFriendPicker}
        onClose={() => setShowFriendPicker(false)}
        onPick={(friend) => {
          setShowFriendPicker(false);
          const goChat = () =>
            router.push({
              pathname: '/chat/[friendId]',
              params: { friendId: friend.id, name: friend.name, color: friend.color },
            });
          if (isSupabaseConfigured && session?.user?.id) {
            void sendMessage(session.user.id, friend.id, { eventId: event.id }).then(goChat);
          } else {
            void appendToThread(friend.id, { fromMe: true, eventId: event.id }).then(goChat);
          }
        }}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12.5, fontWeight: '800' },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.7, lineHeight: 32 },
  infoCard: { padding: 14, gap: 2 },
  desc: { fontSize: 15.5, lineHeight: 24, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  tagText: { fontSize: 12.5, fontWeight: '600' },
  source: { fontSize: 12, marginTop: 8 },
  footerWrap: { position: 'absolute', left: 14, right: 14, bottom: 0 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  cta: { flex: 1 },
  ctaEmpty: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 14 },
  ctaText: { fontSize: 15, fontWeight: '700' },
});
