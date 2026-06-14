import { CATEGORIES, type DotsEvent, type Venue } from '@dots/shared';
import { upsertEventAction } from '@/lib/actions';
import { STATUS_LABELS, toLocalInput } from '@/lib/format';

const EDITABLE_STATUSES = ['draft', 'pending_review', 'published', 'archived'] as const;

export function EventForm({ event, venues }: { event?: DotsEvent; venues: Venue[] }) {
  return (
    <form className="form" action={upsertEventAction}>
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="field">
        <label htmlFor="title">Titel *</label>
        <input id="title" name="title" required defaultValue={event?.title ?? ''} />
      </div>

      <div className="field">
        <label htmlFor="description">Beschreibung</label>
        <textarea
          id="description"
          name="description"
          defaultValue={event?.description ?? ''}
        />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="startAt">Beginn *</label>
          <input
            id="startAt"
            name="startAt"
            type="datetime-local"
            required
            defaultValue={toLocalInput(event?.startAt ?? null)}
          />
        </div>
        <div className="field">
          <label htmlFor="endAt">Ende</label>
          <input
            id="endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={toLocalInput(event?.endAt ?? null)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="venueId">Venue *</label>
          <select id="venueId" name="venueId" required defaultValue={event?.venueId ?? ''}>
            <option value="" disabled>
              Venue wählen …
            </option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="categorySlug">Kategorie *</label>
          <select
            id="categorySlug"
            name="categorySlug"
            required
            defaultValue={event?.category?.slug ?? ''}>
            <option value="" disabled>
              Kategorie wählen …
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="musicGenre">Genre</label>
          <input
            id="musicGenre"
            name="musicGenre"
            placeholder="z. B. Techno"
            defaultValue={event?.musicGenre ?? ''}
          />
        </div>
        <div className="field">
          <label htmlFor="vibeTags">Vibes</label>
          <input
            id="vibeTags"
            name="vibeTags"
            placeholder="rooftop, sunset, cocktails"
            defaultValue={event?.vibeTags.join(', ') ?? ''}
          />
          <span className="hint">Kommagetrennt</span>
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="priceType">Preistyp</label>
          <select id="priceType" name="priceType" defaultValue={event?.priceType ?? 'free'}>
            <option value="free">Frei</option>
            <option value="paid">Bezahlt</option>
            <option value="donation">Spende</option>
            <option value="unknown">Unbekannt</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ageRestriction">Mindestalter</label>
          <input
            id="ageRestriction"
            name="ageRestriction"
            type="number"
            min={0}
            max={99}
            placeholder="18"
            defaultValue={event?.ageRestriction ?? ''}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="priceMin">Preis ab (€)</label>
          <input
            id="priceMin"
            name="priceMin"
            inputMode="decimal"
            placeholder="10"
            defaultValue={event?.priceMin ?? ''}
          />
        </div>
        <div className="field">
          <label htmlFor="priceMax">Preis bis (€)</label>
          <input
            id="priceMax"
            name="priceMax"
            inputMode="decimal"
            placeholder="15"
            defaultValue={event?.priceMax ?? ''}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="ticketUrl">Ticket-URL</label>
          <input
            id="ticketUrl"
            name="ticketUrl"
            type="url"
            placeholder="https://…"
            defaultValue={event?.ticketUrl ?? ''}
          />
        </div>
        <div className="field">
          <label htmlFor="externalUrl">Website / Info-URL</label>
          <input
            id="externalUrl"
            name="externalUrl"
            type="url"
            placeholder="https://…"
            defaultValue={event?.externalUrl ?? ''}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={event?.status ?? 'draft'}>
          {EDITABLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <span className="hint">Nur „Veröffentlicht" erscheint in der App.</span>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {event ? 'Speichern' : 'Event anlegen'}
        </button>
        <a href="/" className="btn">
          Abbrechen
        </a>
      </div>
    </form>
  );
}
