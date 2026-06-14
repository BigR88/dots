// Username-/Handle-Regeln (eindeutiger @handle, getrennt vom Anzeigenamen).
// Spiegeln den CHECK-Constraint aus supabase/migrations/0005_profile_usernames.sql:
//   nur a–z, 0–9, Punkt, Unterstrich · 3–20 Zeichen · klein geschrieben.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

/** Roh-Eingabe in ein gültiges Username-Format überführen (ohne Längen-Pad). */
export function normalizeUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@+/, '') // führendes @ entfernen
    .replace(/\s+/g, '') // keine Leerzeichen
    .replace(/[^a-z0-9._]/g, '') // nur erlaubte Zeichen
    .slice(0, USERNAME_MAX);
}

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value);
}

/** Menschlich lesbarer Hinweis, warum ein Username (noch) ungültig ist. */
export function usernameError(value: string): string | null {
  if (value.length === 0) return 'Benutzername darf nicht leer sein.';
  if (value.length < USERNAME_MIN) return `Mindestens ${USERNAME_MIN} Zeichen.`;
  if (value.length > USERNAME_MAX) return `Höchstens ${USERNAME_MAX} Zeichen.`;
  if (!USERNAME_RE.test(value)) return 'Nur Kleinbuchstaben, Zahlen, . und _';
  return null;
}

/**
 * Fallback-Handle aus Anzeigename/E-Mail ableiten (für Anzeige, solange kein
 * Username gesetzt ist, bzw. als Vorschlag in „Profil bearbeiten").
 */
export function suggestUsername(name?: string | null, email?: string | null): string {
  const base = normalizeUsername(name ?? '') || normalizeUsername((email ?? '').split('@')[0] ?? '');
  const padded = base.length >= USERNAME_MIN ? base : `${base}user`.slice(0, USERNAME_MAX);
  return padded || 'dotsuser';
}
