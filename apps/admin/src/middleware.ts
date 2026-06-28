import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isAuthConfigured, verifySessionToken } from '@/lib/auth';

/**
 * Auth-Gate vor dem gesamten Admin. Läuft auch für Server-Action-POSTs (die an
 * den jeweiligen Seitenpfad gehen) → ungeauthte Aktionen werden geblockt.
 *
 * Frei zugänglich (eigene bzw. keine Auth nötig):
 *   - /login              Login-Seite (GET)
 *   - /api/login          setzt das Session-Cookie nach Passwort-Check
 *   - /api/logout         löscht das Cookie
 *   - /api/cron/*         hat sein eigenes Bearer-Secret (CRON_SECRET)
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/logout') ||
    pathname.startsWith('/api/cron')
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  // Sicherer Default: ohne gesetztes Passwort ist das Admin komplett gesperrt.
  if (!isAuthConfigured()) {
    return new NextResponse(
      'Admin gesperrt: setze ADMIN_PASSWORD in apps/admin/.env.local und starte neu.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  // Browser-Navigation → zur Login-Seite (mit Rücksprungziel).
  if (req.method === 'GET') {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  // Server-Action / sonstige Methode → hart ablehnen.
  return new NextResponse('Nicht angemeldet.', {
    status: 401,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

export const config = {
  // Alles außer Next-internen Assets durch das Gate schicken.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
