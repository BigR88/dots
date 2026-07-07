/**
 * Text-Normalisierung für Dedup & Venue-Matching. Bewusst ohne Dependencies:
 * Unicode-Dekomposition (Umlaute/Akzente), Emojis/Sonderzeichen raus,
 * typische Präfixe ("AUSVERKAUFT:", "FR 12.7. —") abschneiden.
 */

export function normTitle(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // Akzente/Umlaut-Punkte nach Dekomposition
    .replace(/ß/g, 'ss')
    .replace(/^(ausverkauft|sold out|abgesagt|cancell?ed)[:\s!]*/i, '')
    // Datums-/Wochentagspräfixe: "FR 12.7.", "Sa., 12.07.2026 –", "12.7:"
    .replace(
      /^(mo|di|mi|do|fr|sa|so|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)?\.?,?\s*\d{1,2}\.\s?\d{1,2}\.?(\d{2,4})?\s*[–—:|-]*\s*/i,
      '',
    )
    .replace(/[^\p{L}\p{N} ]+/gu, ' ') // Emojis, Satzzeichen → Leerzeichen
    .replace(/\s+/g, ' ')
    .trim();
}

const VENUE_STOPWORDS = /\b(club|bar|cafe|frankfurt|ffm|am|main)\b/g;

/**
 * Token-Überlappungs-Score zweier Venue-Namen (0..1). "Gibson Club Frankfurt"
 * ↔ "Gibson" = 1.0; "Bar" ↔ "Barock" = 0 (Stopwörter zählen nicht).
 */
export function venueMatchScore(a: string, b: string): number {
  const tokens = (s: string): Set<string> =>
    new Set(
      normTitle(s)
        .replace(VENUE_STOPWORDS, ' ')
        .split(' ')
        .filter((w) => w.length >= 3),
    );
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.min(A.size, B.size);
}
