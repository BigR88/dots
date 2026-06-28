/**
 * Auth-Gate für das Admin (Ein-Personen-Tool).
 *
 * Der Admin nutzt den Supabase-Service-Role-Key und umgeht damit RLS — JEDE
 * Server-Action ist also mächtig. Ohne Login wären diese Actions (und der
 * SSRF-fähige Quellen-Scan) für jeden erreichbar, der den Port erreicht.
 * Deshalb ein simples, aber solides Passwort-Gate:
 *   - ein gemeinsames Passwort in `ADMIN_PASSWORD` (serverseitig, geheim)
 *   - nach Login ein HMAC-signiertes, httpOnly-Cookie (kein DB-State nötig)
 *   - die `middleware.ts` prüft das Cookie vor ALLEN Seiten + Server-Actions
 *
 * Bewusst dependency-frei und Edge-tauglich (Web Crypto), damit es sowohl in
 * der Middleware (Edge) als auch in Route-Handlern (Node) läuft.
 *
 * Upgrade-Pfad (später, bei mehreren Redakteur:innen): echte Supabase-Accounts
 * + `is_admin()`-Rollencheck statt eines geteilten Passworts.
 */

export const SESSION_COOKIE = 'dots_admin_session';
/** Cookie-Lebensdauer: 7 Tage. */
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 7;

/** HMAC-Schlüssel: eigener Secret bevorzugt, sonst das Passwort selbst. */
function sessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

/** Ist überhaupt ein Passwort gesetzt? Ohne → Gate sperrt alles (sicherer Default). */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

async function hmacHex(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Konstant-Zeit-Vergleich (verhindert Timing-Lecks beim Passwort/Signatur-Check). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Erzeugt ein signiertes Session-Token `"<exp>.<hmac>"` (exp = Ablauf in ms). */
export async function createSessionToken(): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error('ADMIN_PASSWORD/ADMIN_SESSION_SECRET fehlt.');
  const exp = String(Date.now() + SESSION_MAX_AGE_S * 1000);
  const sig = await hmacHex(exp, secret);
  return `${exp}.${sig}`;
}

/** Prüft Signatur + Ablauf eines Session-Tokens. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  const secret = sessionSecret();
  if (!secret || !token) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp)) return false;
  const expected = await hmacHex(exp, secret);
  if (!timingSafeEqual(sig, expected)) return false;
  return Number(exp) > Date.now();
}

/** Prüft das eingegebene Passwort gegen `ADMIN_PASSWORD` (konstant-Zeit). */
export function verifyPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return timingSafeEqual(input, pw);
}
