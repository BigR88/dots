import { Ionicons } from '@expo/vector-icons';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import {
  CATEGORIES,
  QUICK_FILTERS,
  SORT_OPTIONS,
  type QuickFilterId,
  type SortId,
} from '@dots/shared';
import { useTheme } from '@/theme/theme';
import { FilterPill } from './FilterPill';
import { GlassCard } from './GlassCard';
import { SearchBar } from './SearchBar';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Section = 'category' | 'quick' | 'sort';

interface Props {
  search: string;
  onSearch: (v: string) => void;
  categorySlug?: string | null;
  /** Mehrfachauswahl (Karte): Prädikat statt einzelnem Slug. */
  isCategoryActive?: (slug: string) => boolean;
  /** Zusammenfassungstext für die Kategorie-Zeile überschreiben (z. B. „3 aktiv"). */
  activeCategoryLabel?: string;
  onToggleCategory: (slug: string) => void;
  quickFilters: QuickFilterId[];
  onToggleQuick: (id: QuickFilterId) => void;
  sort?: SortId;
  onChangeSort?: (s: SortId) => void;
  /** Sortier-Akkordeon ausblenden (z. B. auf der Karte). */
  showSort?: boolean;
  openSection: Section | null;
  onOpenSection: (s: Section | null) => void;
  onReset: () => void;
  hasActive: boolean;
}

/** Aufziehbares Glas-Panel mit Akkordeon-Listen für Suche, Filter & Sortierung. */
export function FilterPanel({
  search,
  onSearch,
  categorySlug,
  isCategoryActive,
  activeCategoryLabel,
  onToggleCategory,
  quickFilters,
  onToggleQuick,
  sort,
  onChangeSort,
  showSort = true,
  openSection,
  onOpenSection,
  onReset,
  hasActive,
}: Props) {
  const t = useTheme();

  const toggleSection = (s: Section) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onOpenSection(openSection === s ? null : s);
  };

  const catName =
    activeCategoryLabel ?? (CATEGORIES.find((c) => c.slug === categorySlug)?.name ?? 'Alle');
  const quickSummary = quickFilters.length ? `${quickFilters.length} aktiv` : 'Keine';
  const sortLabel = SORT_OPTIONS.find((s) => s.id === sort)?.label ?? 'Datum';

  return (
    <GlassCard intensity={60} style={styles.panel}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChange={onSearch} />
        </View>

        <Accordion
          title="Kategorie"
          summary={catName}
          icon="grid-outline"
          open={openSection === 'category'}
          onToggle={() => toggleSection('category')}>
          <View style={styles.pillWrap}>
            {CATEGORIES.map((c) => (
              <FilterPill
                key={c.slug}
                label={c.name}
                icon={c.icon}
                color={c.color}
                active={isCategoryActive ? isCategoryActive(c.slug) : categorySlug === c.slug}
                onPress={() => onToggleCategory(c.slug)}
              />
            ))}
          </View>
        </Accordion>

        <Accordion
          title="Schnellfilter"
          summary={quickSummary}
          icon="options-outline"
          open={openSection === 'quick'}
          onToggle={() => toggleSection('quick')}
          last={!showSort}>
          <View style={styles.pillWrap}>
            {QUICK_FILTERS.map((q) => (
              <FilterPill
                key={q.id}
                label={q.label}
                icon={q.icon}
                active={quickFilters.includes(q.id)}
                onPress={() => onToggleQuick(q.id)}
              />
            ))}
          </View>
        </Accordion>

        {showSort && onChangeSort && (
          <Accordion
            title="Sortieren"
            summary={sortLabel}
            icon="swap-vertical-outline"
            open={openSection === 'sort'}
            onToggle={() => toggleSection('sort')}
            last>
            <View style={styles.radioWrap}>
              {SORT_OPTIONS.map((opt) => {
                const active = opt.id === sort;
                return (
                  <Pressable key={opt.id} onPress={() => onChangeSort(opt.id)} style={styles.radioRow}>
                    <Text
                      style={[
                        styles.radioLabel,
                        { color: active ? t.accent : t.colors.textPrimary, fontWeight: active ? '800' : '500' },
                      ]}>
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark-circle" size={19} color={t.accent} />}
                  </Pressable>
                );
              })}
            </View>
          </Accordion>
        )}

        {hasActive && (
          <Pressable onPress={onReset} style={styles.reset}>
            <Ionicons name="close-circle-outline" size={16} color={t.colors.textSecondary} />
            <Text style={[styles.resetText, { color: t.colors.textSecondary }]}>
              Filter zurücksetzen
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </GlassCard>
  );
}

function Accordion({
  title,
  summary,
  icon,
  open,
  onToggle,
  last,
  children,
}: {
  title: string;
  summary: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  last?: boolean;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[styles.section, !last && { borderBottomColor: t.colors.glassBorder, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Pressable style={styles.sectionHead} onPress={onToggle}>
        <Ionicons name={icon as never} size={17} color={t.accent} />
        <Text style={[styles.sectionTitle, { color: t.colors.textPrimary }]}>{title}</Text>
        {!open && (
          <Text numberOfLines={1} style={[styles.sectionSummary, { color: t.colors.textMuted }]}>
            {summary}
          </Text>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.textMuted} />
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { maxHeight: 470, paddingHorizontal: 16, paddingVertical: 14 },
  searchWrap: { marginBottom: 4 },
  section: {},
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  sectionSummary: { flex: 1, textAlign: 'right', fontSize: 13.5 },
  sectionBody: { paddingBottom: 14 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radioWrap: { gap: 2 },
  radioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  radioLabel: { fontSize: 15 },
  reset: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 2 },
  resetText: { fontSize: 14, fontWeight: '700' },
});
