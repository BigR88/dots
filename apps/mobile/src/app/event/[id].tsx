import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import { MapToast } from '@/components/MapToast';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RouteChooserSheet } from '@/components/RouteChooserSheet';
import { ScreenBackground } from '@/components/ScreenBackground';
import { sendMessage } from '@/data/chat';
import { getEventById } from '@/data/events';
import { logEventClick } from '@/data/social';
import { isSupabaseConfigured } from '@/data/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useRouteChooser } from '@/hooks/use-route-chooser';
import { useToast } from '@/hooks/use-toast';
import { appendToThread } from '@/lib/chat-store';
import { hexA } from '@/lib/color';
import { formatDateTime, formatPrice, isFree } from '@/lib/format';
import { shareText } from '@/lib/share';
import { useTheme } from '@/theme/theme';

function primaryCta(e: DotsEvent): { label: string; url: string } {
  if (e.ticketUrl) return { label: 'Tickets ansehen', url: e.ticketUrl };
  if (e.externalUrl) return { label: 'Zur Eventseite', url: e.externalUrl };
  if (e.venue?.websiteUrl) return { label: 'Zur Venue-Website', url: e.venue.websiteUrl };
  if (e.venue?.instagram) return { label: 'Auf Instagram', url: `https://instagram.com/${e.venue.instagram}` };
  // Garantierter Ausstieg: ohne hinterlegten Link führt der CTA zur Websuche —
  // der Haupt-Button der Detailseite ist damit nie tot.
  const q = encodeURIComponent(`${e.title} ${e.venue?.name ?? ''} Frankfurt`.trim());
  return { label: 'Im Web suchen', url: `https://www.google.com/search?q=${q}` };
}

export default function EventDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const { toast, showToast } = useToast();
  const { promptRoute, chooserProps } = useRouteChooser();

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
  const openCta = () => WebBrowser.openBrowserAsync(cta.url);
  const openMaps = () => promptRoute(event);
  const onShare = async () => {
    const outcome = await shareText(
      `${event.title} — ${formatDateTime(event.startAt)} · ${event.venue?.name ?? 'Frankfurt'} (via dots)`,
    );
    if (outcome === 'copied') showToast('In die Zwischenablage kopiert');
    else if (outcome === 'failed') showToast('Teilen wird hier nicht unterstützt');
  };

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
            <InfoRow
              icon="location-outline"
              onPress={openMaps}
              trailing={
                <View style={[styles.routeChip, { backgroundColor: hexA(t.accent, 0.12) }]}>
                  <Ionicons name="navigate" size={13} color={t.accent} />
                  <Text style={[styles.routeChipText, { color: t.accent }]}>Route</Text>
                </View>
              }>
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

      {/* Rückmeldung des Zwischenablage-Fallbacks (Web ohne Share-Sheet) */}
      <MapToast message={toast} top={insets.top + 16} />

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
          <PrimaryButton label={cta.label} rightIcon="open-outline" onPress={openCta} style={styles.cta} />
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

      <RouteChooserSheet {...chooserProps} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12.5, fontWeight: '800' },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  routeChipText: { fontSize: 12.5, fontWeight: '800' },
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
});
