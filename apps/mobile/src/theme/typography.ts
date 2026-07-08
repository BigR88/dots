import type { TextStyle } from 'react-native';

/**
 * Große Seiten-Headline der Tab-Screens („events.", „freunde.", „profil.", …) —
 * EINE Quelle für Größe/Gewicht/Laufweite, damit die Typo beim Tab-Wechsel
 * nicht springt (vorher: 30/-1, 30/-0.9 und 28/-0.8 gemischt).
 */
export const PAGE_TITLE: TextStyle = { fontSize: 30, fontWeight: '900', letterSpacing: -1 };
