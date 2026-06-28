import Link from 'next/link';
import { ImportBox } from '@/components/ImportBox';
import {
  CANDIDATE_STATUS_LABELS,
  confidenceTier,
  formatCandidateWhen,
} from '@/lib/format';
import { listCandidates } from '@/lib/candidates-store';
import { listSources } from '@/lib/sources-store';
import { anthropicConfigured } from '@/lib/importer/anthropic';

export const dynamic = 'force-dynamic';

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const [candidates, sources] = await Promise.all([listCandidates(), listSources()]);
  const pending = candidates.filter((c) => c.status === 'pending');
  const done = candidates.filter((c) => c.status !== 'pending');

  return (
    <>
      <div className="page-head">
        <h1>KI-Import</h1>
        <span className="meta">{pending.length} zu prüfen · {candidates.length} gesamt</span>
      </div>

      {sp.msg && <div className="notice">✓ {sp.msg}</div>}
      {sp.err && <div className="notice err">⚠ {sp.err}</div>}
      {!anthropicConfigured && (
        <div className="notice err">
          <code>ANTHROPIC_API_KEY</code> ist nicht gesetzt — die Extraktion schlägt fehl. Schlüssel
          in <code>apps/admin/.env.local</code> eintragen und Server neu starten.
        </div>
      )}

      <ImportBox sources={sources} />

      <h2 className="section-title">Zu prüfen</h2>
      {pending.length === 0 ? (
        <div className="empty">Keine offenen Kandidaten — füge oben Text oder ein Plakat ein.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Wann</th>
              <th>Ort</th>
              <th>Konfidenz</th>
              <th>Hinweise</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((c) => {
              const e = c.extracted;
              const tier = confidenceTier(c.confidenceScore);
              return (
                <tr key={c.id}>
                  <td>
                    <div className="event-title">
                      <Link href={`/candidates/${c.id}`}>{e.title || '(ohne Titel)'}</Link>
                    </div>
                    {e.music_genre && <div className="event-sub">{e.music_genre}</div>}
                  </td>
                  <td>{formatCandidateWhen(e.start_datetime)}</td>
                  <td>{e.venue_name || '—'}</td>
                  <td>
                    <span className={`pill conf-${tier}`}>
                      {Math.round(c.confidenceScore * 100)}%
                    </span>
                  </td>
                  <td>
                    {c.missingFields.length > 0 && (
                      <span className="tag tag-warn">fehlt: {c.missingFields.join(', ')}</span>
                    )}
                    {c.possibleDuplicateOf && <span className="tag tag-dup">mögl. Duplikat</span>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/candidates/${c.id}`} className="btn btn-sm btn-primary">
                        Prüfen
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {done.length > 0 && (
        <>
          <h2 className="section-title">Erledigt</h2>
          <table>
            <tbody>
              {done.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/candidates/${c.id}`}>{c.extracted.title || '(ohne Titel)'}</Link>
                  </td>
                  <td>{formatCandidateWhen(c.extracted.start_datetime)}</td>
                  <td>
                    <span className={`pill pill-${c.status === 'approved' ? 'published' : 'rejected'}`}>
                      {CANDIDATE_STATUS_LABELS[c.status]}
                    </span>
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
