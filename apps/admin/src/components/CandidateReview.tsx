import { CATEGORIES, type ImportedEventCandidate, type Venue } from '@dots/shared';
import {
  approveCandidateAction,
  markDuplicateCandidateAction,
  rejectCandidateAction,
} from '@/lib/actions';

/**
 * Review-Formular: alle extrahierten Felder vorbefüllt + editierbar. Beim
 * Freigeben werden die (ggf. korrigierten) Werte als Overrides an
 * promote_candidate übergeben → ein Event mit Status „zur Prüfung" entsteht.
 */
export function CandidateReview({
  candidate,
  venues,
  duplicateLabel,
}: {
  candidate: ImportedEventCandidate;
  venues: Venue[];
  duplicateLabel?: string | null;
}) {
  const e = candidate.extracted;
  const isPending = candidate.status === 'pending';

  return (
    <>
      {candidate.possibleDuplicateOf && (
        <div className="notice err">
          ⚠ Mögliches Duplikat eines bestehenden Events
          {duplicateLabel ? `: „${duplicateLabel}"` : ''}. Vor dem Freigeben prüfen.
        </div>
      )}

      {candidate.rawInput && (
        <details className="raw">
          <summary>Original-Input anzeigen</summary>
          <pre>{candidate.rawInput}</pre>
        </details>
      )}

      <form action={approveCandidateAction} className="form">
        <input type="hidden" name="id" value={candidate.id} />

        <div className="field">
          <label>Titel *</label>
          <input name="title" defaultValue={e.title ?? ''} required />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Datum *</label>
            <input type="date" name="date" defaultValue={e.date ?? ''} required />
          </div>
          <div className="field">
            <label>Konfidenz</label>
            <input value={`${Math.round(candidate.confidenceScore * 100)} %`} readOnly disabled />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Start</label>
            <input type="time" name="start_time" defaultValue={e.start_time ?? ''} />
          </div>
          <div className="field">
            <label>Ende</label>
            <input type="time" name="end_time" defaultValue={e.end_time ?? ''} />
          </div>
        </div>

        <div className="field">
          <label>Location (Name) *</label>
          <input name="location_name" defaultValue={e.location_name ?? ''} />
          <span className="hint">
            Leer „Venue" lassen = automatischer Abgleich über den Namen. Oder hier fest zuordnen:
          </span>
        </div>
        <div className="field">
          <label>Venue zuordnen</label>
          <select name="venueId" defaultValue="">
            <option value="">— automatisch (Namensabgleich) —</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Adresse</label>
            <input name="address" defaultValue={e.address ?? ''} />
          </div>
          <div className="field">
            <label>Stadt</label>
            <input name="city" defaultValue={e.city ?? 'Frankfurt am Main'} />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Kategorie</label>
            <select name="category" defaultValue={e.category ?? ''}>
              <option value="">— keine —</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Musik-Genre</label>
            <input name="music_genre" defaultValue={e.music_genre ?? ''} />
          </div>
        </div>

        <div className="form-row">
          <div className="field">
            <label>Preis</label>
            <input name="price" defaultValue={e.price ?? ''} placeholder="z. B. 15 oder free" />
          </div>
          <div className="field">
            <label>Altersfreigabe</label>
            <input name="age_restriction" defaultValue={e.age_restriction ?? ''} placeholder="18" />
          </div>
        </div>

        <div className="field">
          <label>Vibe-Tags (Komma-getrennt)</label>
          <input name="vibeTags" defaultValue={(e.vibe_tags ?? []).join(', ')} />
        </div>

        <div className="field">
          <label>Beschreibung</label>
          <textarea name="description" defaultValue={e.description ?? ''} />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Ticket-URL</label>
            <input name="ticket_url" defaultValue={e.ticket_url ?? ''} />
          </div>
          <div className="field">
            <label>Quell-URL</label>
            <input name="source_url" defaultValue={e.source_url ?? ''} />
          </div>
        </div>

        <div className="field">
          <label>Veranstalter</label>
          <input name="organizer" defaultValue={e.organizer ?? ''} />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={!isPending}>
            ✓ Freigeben → Event anlegen
          </button>
        </div>
      </form>

      {isPending && (
        <div className="review-secondary">
          <form action={rejectCandidateAction} className="card">
            <input type="hidden" name="id" value={candidate.id} />
            <div className="field">
              <label>Ablehnen — Grund (optional)</label>
              <input name="note" placeholder="z. B. kein echtes Event / Spam" />
            </div>
            <button type="submit" className="btn btn-danger">
              Ablehnen
            </button>
          </form>
          <form action={markDuplicateCandidateAction}>
            <input type="hidden" name="id" value={candidate.id} />
            <button type="submit" className="btn">
              Als Duplikat markieren
            </button>
          </form>
        </div>
      )}
    </>
  );
}
