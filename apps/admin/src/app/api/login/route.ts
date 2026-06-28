import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  createSessionToken,
  isAuthConfigured,
  verifyPassword,
} from '@/lib/auth';

/** Nur interne Pfade als Rücksprungziel zulassen (kein Open-Redirect). */
function safeNext(raw: string): string {
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

export async function POST(req: NextRequest) {
  if (!isAuthConfigured()) {
    return new NextResponse('ADMIN_PASSWORD ist nicht gesetzt.', { status: 503 });
  }

  const form = await req.formData();
  const password = String(form.get('password') ?? '');
  const next = safeNext(String(form.get('next') ?? '/'));

  const url = req.nextUrl.clone();
  url.search = '';

  if (!verifyPassword(password)) {
    url.pathname = '/login';
    url.searchParams.set('error', '1');
    if (next !== '/') url.searchParams.set('next', next);
    return NextResponse.redirect(url, { status: 303 });
  }

  url.pathname = next;
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    // Lokal über http (localhost) darf das Cookie nicht "secure" sein, sonst
    // wird es nie gesetzt. An der tatsächlichen Anfrage festmachen, nicht an
    // NODE_ENV (production-Build läuft lokal ebenfalls über http).
    secure: req.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
  return res;
}
