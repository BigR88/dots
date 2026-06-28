import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';
import { usingLiveBackend } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: 'dots Admin',
  description: 'Events für Frankfurt pflegen',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Auf der Login-Seite (keine Session) die Navigation/Banner ausblenden.
  const signedIn = Boolean((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <html lang="de">
      <body>
        {signedIn && (
          <>
            <header className="topbar">
              <Link href="/" className="brand">
                dots<span className="brand-dot">.</span>{' '}
                <span className="brand-suffix">Admin</span>
              </Link>
              <nav className="nav">
                <Link href="/">Events</Link>
                <Link href="/candidates">KI-Import</Link>
                <Link href="/sources">Quellen</Link>
                <Link href="/events/new" className="btn btn-primary">
                  + Neues Event
                </Link>
                <form action="/api/logout" method="post">
                  <button type="submit" className="btn btn-sm" title="Abmelden">
                    Abmelden
                  </button>
                </form>
              </nav>
            </header>
            {usingLiveBackend ? (
              <div className="demo-banner live">
                Verbunden mit Supabase · Änderungen sind sofort in der App sichtbar.
              </div>
            ) : (
              <div className="demo-banner">
                Demo-Modus · Änderungen werden lokal gespeichert (<code>.data/events.json</code>) —
                Supabase wird zum Schluss verknüpft.
              </div>
            )}
          </>
        )}
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
