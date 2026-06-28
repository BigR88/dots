import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * Höflicher, SSRF-sicherer HTTP-Helfer für die Website-Ingestion:
 *  - nur http/https,
 *  - blockiert interne/private/Loopback/Link-Local/Metadaten-Adressen
 *    (auch über Redirects — jeder Hop wird neu geprüft),
 *  - eigener User-Agent, Timeout, Body-Größenlimit,
 *  - robots.txt wird vor dem Abruf respektiert.
 * Bewusst KEIN aggressives Crawling: pro Lauf nur die konfigurierte URL.
 */

export const USER_AGENT = 'dotsbot/1.0 (+https://github.com/BigR88/dots; Event-Aggregator Frankfurt)';
const CRAWLER_TOKEN = 'dotsbot';

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 5_000_000; // 5 MB Body-Limit
const MAX_REDIRECTS = 5;

export interface FetchResult {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
  error?: string;
}

// ── SSRF-Guard ──────────────────────────────────────────────────────────────
function ipIsBlocked(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true; // this-host / privat / loopback
    if (a === 169 && b === 254) return true; // link-local + Cloud-Metadaten (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // privat
    if (a === 192 && b === 168) return true; // privat
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const lc = ip.toLowerCase();
  if (lc === '::1' || lc === '::') return true;
  if (lc.startsWith('::ffff:')) return ipIsBlocked(lc.slice(7)); // IPv4-mapped
  if (lc.startsWith('fc') || lc.startsWith('fd')) return true; // ULA
  if (lc.startsWith('fe80')) return true; // link-local
  return false;
}

/** Wirft, wenn die URL kein öffentlicher http(s)-Endpunkt ist. */
async function assertPublicUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Ungültige URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`Nur http/https erlaubt (war: ${u.protocol})`);
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === '' || host === 'localhost' || host.endsWith('.localhost') || host === '0.0.0.0') {
    throw new Error('Interne Adresse blockiert');
  }
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.length === 0) throw new Error('DNS-Auflösung fehlgeschlagen');
  for (const a of addrs) {
    if (ipIsBlocked(a.address)) throw new Error(`Interne/private Adresse blockiert (${a.address})`);
  }
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      if (total > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function rawFetch(url: string, accept: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let current = url;
    let res: Response | null = null;
    // Redirects manuell folgen → jeder Hop wird gegen den SSRF-Guard geprüft.
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicUrl(current);
      res = await fetch(current, {
        headers: { 'user-agent': USER_AGENT, accept },
        redirect: 'manual',
        signal: controller.signal,
      });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        if (hop === MAX_REDIRECTS) return { ok: false, status: res.status, contentType: '', body: '', error: 'Zu viele Redirects' };
        current = new URL(loc, current).toString();
        continue;
      }
      break;
    }
    if (!res) return { ok: false, status: 0, contentType: '', body: '', error: 'Kein Response' };
    const contentType = res.headers.get('content-type') ?? '';
    const body = await readCapped(res);
    return { ok: res.ok, status: res.status, contentType, body };
  } catch (e) {
    return { ok: false, status: 0, contentType: '', body: '', error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Prüft robots.txt der Origin gegen unseren User-Agent (und '*'). Konservativ:
 * Bei einer passenden Disallow-Regel auf dem Pfad → false. Fehlt robots.txt /
 * Fehler → erlaubt (der eigentliche Abruf re-prüft den SSRF-Guard ohnehin).
 */
export async function isAllowedByRobots(url: string): Promise<boolean> {
  let origin: string;
  let pathname: string;
  try {
    const u = new URL(url);
    origin = u.origin;
    pathname = u.pathname || '/';
  } catch {
    return false;
  }
  const res = await rawFetch(`${origin}/robots.txt`, 'text/plain');
  if (!res.ok || !res.body) return true;

  const lines = res.body.split('\n').map((l) => l.replace(/#.*$/, '').trim());
  const groups: { agents: string[]; disallow: string[] }[] = [];
  let current: { agents: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.toLowerCase().trim();
    const val = rest.join(':').trim();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if (key === 'disallow' && current) {
      current.disallow.push(val);
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  // RFC 9309: Gruppe gilt, wenn der robots-Token '*' ist oder unserem
  // Produkt-Token entspricht (Gleichheit, nicht Substring).
  const relevant = groups.filter((g) => g.agents.includes('*') || g.agents.includes(CRAWLER_TOKEN));
  for (const g of relevant) {
    for (const rule of g.disallow) {
      if (rule === '') continue; // leeres Disallow = alles erlaubt
      if (pathname.startsWith(rule)) return false;
    }
  }
  return true;
}

/** Lädt eine URL als Text, nachdem robots.txt + SSRF-Guard geprüft wurden. */
export async function politeFetch(url: string, accept = 'text/html,application/xhtml+xml'): Promise<FetchResult> {
  if (!(await isAllowedByRobots(url))) {
    return { ok: false, status: 0, contentType: '', body: '', error: 'robots.txt verbietet diesen Pfad' };
  }
  return rawFetch(url, accept);
}
