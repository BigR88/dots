import Link from 'next/link';
import { deleteEventAction, resetDemoAction, setStatusAction } from '@/lib/actions';
import { listCandidates } from '@/lib/candidates-store';
import { formatPrice, formatStart, STATUS_LABELS } from '@/lib/format';
import { listSources } from '@/lib/sources-store';
import { listAllEvents, usingLiveBackend } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const events = await listAllEvents();
  // Kommandozentrale: Kennzahlen defensiv laden — die Startseite darf nie brechen.
  const [pending, sources] = await Promise.all([
    listCandidates('pending').catch(() => []),
    listSources().catch(() => []),
  ]);
  const published = events.filter((e) => e.status === 'published').length;
  const inReview = events.filter((e) => e.status === 'pending_review').length;
  const activeSources = sources.filter((s) => s.active).length;

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-label">Events live</span>
          <span className="stat-value">{published}</span>
          <span className="stat-sub">{events.length} gesamt · {inReview} zur Prüfung</span>
        </div>
        <Link href="/candidates" className="stat-card stat-accent">
          <span className="stat-label">KI-Kandidaten offen</span>
          <span className="stat-value">{pending.length}</span>
          <span className="stat-sub">{pending.length > 0 ? 'Jetzt reviewen →' : 'Alles erledigt ✓'}</span>
        </Link>
        <Link href="/sources" className="stat-card">
          <span className="stat-label">Quellen aktiv</span>
          <span className="stat-value">{activeSources}</span>
          <span className="stat-sub">{sources.length} angelegt · Scans &amp; Läufe →</span>
        </Link>
      </div>

      <div className="page-head">
        <h1>Events</h1>
        <div className="toolbar">
          <span className="meta">
            {events.length} Events · {events.filter((e) => e.status === 'published').length}{' '}
            veröffentlicht
          </span>
          {!usingLiveBackend && (
            <form action={resetDemoAction}>
              <button type="submit" className="btn btn-sm" title="Demo-Daten zurücksetzen">
                ↺ Demo-Daten zurücksetzen
              </button>
            </form>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty">Keine Events — lege das erste an.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Wann</th>
              <th>Venue</th>
              <th>Kategorie</th>
              <th>Preis</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="event-title">
                    <Link href={`/events/${e.id}`}>{e.title}</Link>
                  </div>
                  {e.musicGenre && <div className="event-sub">{e.musicGenre}</div>}
                </td>
                <td>{formatStart(e.startAt)}</td>
                <td>{e.venue?.name ?? '—'}</td>
                <td>
                  {e.category ? (
                    <span className="cat">
                      <span
                        className="cat-dot"
                        style={{ background: e.category.color ?? '#999' }}
                      />
                      {e.category.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{formatPrice(e)}</td>
                <td>
                  <span className={`pill pill-${e.status}`}>{STATUS_LABELS[e.status]}</span>
                </td>
                <td>
                  <div className="row-actions">
                    <Link href={`/events/${e.id}`} className="btn btn-sm">
                      Bearbeiten
                    </Link>
                    <form action={setStatusAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={e.status === 'published' ? 'draft' : 'published'}
                      />
                      <button type="submit" className="btn btn-sm">
                        {e.status === 'published' ? 'Verstecken' : 'Veröffentlichen'}
                      </button>
                    </form>
                    <form action={deleteEventAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="btn btn-sm btn-danger">
                        Löschen
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
