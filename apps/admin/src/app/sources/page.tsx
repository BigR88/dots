import type { SourceType } from '@dots/shared';
import { deleteSourceAction, saveSourceAction } from '@/lib/actions';
import { listSources } from '@/lib/sources-store';

export const dynamic = 'force-dynamic';

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  instagram_link: 'Instagram',
  website: 'Website',
  newsletter: 'Newsletter',
  official_api: 'Offizielle API',
  manual: 'Manuell',
  partner_submission: 'Partner',
};

export default async function SourcesPage() {
  const sources = await listSources();

  return (
    <>
      <div className="page-head">
        <h1>Quellen</h1>
        <span className="meta">{sources.length} kuratierte Quellen</span>
      </div>

      <p className="hint" style={{ marginBottom: 16 }}>
        Die Liste der Quellen, aus denen der Agent Events zieht. Pflege sie hier manuell. Beim
        Import (Text/Plakat) kannst du oben eine Quelle zuordnen.
      </p>

      <form action={saveSourceAction} className="card source-add">
        <h3>+ Quelle hinzufügen</h3>
        <div className="form-row">
          <div className="field">
            <label>Name *</label>
            <input name="name" placeholder="z. B. Tanzhaus West (Instagram)" required />
          </div>
          <div className="field">
            <label>Typ</label>
            <select name="type" defaultValue="instagram_link">
              {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>URL / Handle (optional)</label>
          <input name="url" placeholder="https://… oder @tanzhauswest" />
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
              <th>URL / Handle</th>
              <th>Vertrauen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td className="event-title">{s.name ?? '—'}</td>
                <td>{SOURCE_TYPE_LABELS[s.type]}</td>
                <td>{s.url ?? '—'}</td>
                <td>{s.isTrusted ? '✓' : '—'}</td>
                <td>
                  <div className="row-actions">
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
    </>
  );
}
