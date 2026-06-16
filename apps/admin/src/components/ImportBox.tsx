import type { EventSource } from '@dots/shared';
import { pasteImportAction, posterImportAction } from '@/lib/actions';

/**
 * Zwei Import-Wege nebeneinander: Text einfügen (IG-Caption/Newsletter/Website-
 * Text) und Plakat hochladen (Vision). Beide schicken an die Review-Queue.
 */
export function ImportBox({ sources }: { sources: EventSource[] }) {
  return (
    <div className="import-grid">
      <form action={pasteImportAction} className="card">
        <h3>📋 Text einfügen</h3>
        <p className="hint">
          Instagram-Caption, Newsletter oder Programm-Text einfügen — Claude erkennt die
          Veranstaltung(en).
        </p>
        <div className="field">
          <textarea
            name="text"
            rows={7}
            placeholder={'z. B.\nFr 20.06 · Tanzhaus West\nTECHNO NIGHT mit ...\nEinlass 23h · 15€ · ab 18'}
          />
        </div>
        <SourceFields sources={sources} />
        <button className="btn btn-primary" type="submit">
          Extrahieren
        </button>
      </form>

      <form action={posterImportAction} className="card" encType="multipart/form-data">
        <h3>🖼️ Plakat hochladen</h3>
        <p className="hint">
          Event-Plakat (JPEG, PNG, WebP) — Claude Vision liest Titel, Datum, Ort und Preis aus dem
          Bild.
        </p>
        <div className="field">
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" />
        </div>
        <SourceFields sources={sources} />
        <button className="btn btn-primary" type="submit">
          Extrahieren
        </button>
      </form>
    </div>
  );
}

function SourceFields({ sources }: { sources: EventSource[] }) {
  return (
    <>
      <div className="field">
        <label>Quelle (optional)</label>
        <select name="sourceId" defaultValue="">
          <option value="">— keine —</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name ?? s.id}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Kontext-Hinweis (optional)</label>
        <input name="context" placeholder="z. B. Venue-/Account-Name" />
      </div>
    </>
  );
}
