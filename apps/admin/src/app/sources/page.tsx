import type { SourceType } from '@dots/shared';
import { deleteSourceAction, saveSourceAction, scanSourceAction } from '@/lib/actions';
import { listSources } from '@/lib/sources-store';
import { listRuns } from '@/lib/runs-store';

export const dynamic = 'force-dynamic';

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  website: 'Website',
  rss: 'RSS-Feed',
  ical: 'iCal (.ics)',
  api: 'API',
  official_api: 'Offizielle API',
  newsletter: 'Newsletter',
  instagram_link: 'Instagram-Link',
  instagram_manual: 'Instagram (manuell)',
  organizer: 'Veranstalter',
  partner_submission: 'Partner',
  manual: 'Manuell',
};

// Quelltypen, die per URL automatisch gescannt werden können.
const SCANNABLE: SourceType[] = ['website', 'rss', 'ical', 'api', 'official_api', 'organizer'];

function fmt(dt: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  return Number.isNaN(d.getTime())
    ? '—'
    : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
}

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  const [sources, runs] = await Promise.all([listSources(), listRuns(8)]);

  return (
    <>
      <div className="page-head">
        <h1>Quellen</h1>
        <span className="meta">{sources.length} kuratierte Quellen</span>
      </div>

      {sp.msg && <div className="notice">✓ {sp.msg}</div>}
      {sp.err && <div className="notice err">⚠ {sp.err}</div>}

      <p className="hint" style={{ marginBottom: 16 }}>
        Quellen, aus denen der Agent Events zieht. Bei <strong>Website/RSS/iCal/API</strong> mit URL
        liest „Scannen" automatisch (JSON-LD/iCal/RSS bevorzugt, sonst Seitentext → KI). Für
        Instagram nutze den Flyer-/Screenshot-Upload bzw. „Text einfügen".
      </p>

      <form action={saveSourceAction} className="card source-add">
        <h3>+ Quelle hinzufügen</h3>
        <div className="form-row">
          <div className="field">
            <label>Name *</label>
            <input name="name" placeholder="z. B. Tanzhaus West Programm" required />
          </div>
          <div className="field">
            <label>Typ</label>
            <select name="type" defaultValue="website">
              {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>URL (für automatischen Scan)</label>
          <input name="url" placeholder="https://tanzhaus-west.de/programm" />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Scan-Frequenz</label>
            <select name="checkFrequency" defaultValue="manual">
              <option value="manual">manuell</option>
              <option value="daily">täglich</option>
              <option value="weekly">wöchentlich</option>
              <option value="hourly">stündlich</option>
            </select>
          </div>
          <div className="field">
            <label>Notizen</label>
            <input name="notes" placeholder="optional" />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" name="isTrusted" /> Vertrauenswürdig
        </label>
        <button type="submit" className="btn btn-primary">
          Speichern
        </button>
      </form>

      {sources.length === 0 ? (
        <div className="empty">Noch keine Quellen.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Typ</th>
              <th>URL</th>
              <th>Frequenz</th>
              <th>Zuletzt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td className="event-title">
                  {s.name ?? '—'}
                  {!s.active && <span className="tag tag-warn" style={{ marginLeft: 6 }}>inaktiv</span>}
                </td>
                <td>{SOURCE_TYPE_LABELS[s.type] ?? s.type}</td>
                <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.url ?? '—'}
                </td>
                <td>{s.checkFrequency}</td>
                <td>{fmt(s.lastCheckedAt)}</td>
                <td>
                  <div className="row-actions">
                    {s.url && SCANNABLE.includes(s.type) && (
                      <form action={scanSourceAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="btn btn-sm btn-primary">
                          Scannen
                        </button>
                      </form>
                    )}
                    <form action={deleteSourceAction}>
                      <input type="hidden" name="id" value={s.id} />
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

      {runs.length > 0 && (
        <>
          <h2 className="section-title">Letzte Scan-Läufe</h2>
          <table>
            <thead>
              <tr>
                <th>Start</th>
                <th>Status</th>
                <th>Gefunden</th>
                <th>Importiert</th>
                <th>Log</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.startedAt)}</td>
                  <td>
                    <span className={`pill pill-${r.status === 'success' ? 'published' : r.status === 'failed' ? 'rejected' : 'draft'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.foundEventsCount}</td>
                  <td>{r.createdEventsCount}</td>
                  <td style={{ maxWidth: 320, fontSize: 12, color: 'var(--text-muted)' }}>
                    {r.errorMessage ?? (r.logs ? r.logs.split('\n').slice(-1)[0] : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
