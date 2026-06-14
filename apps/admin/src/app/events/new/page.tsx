import { EventForm } from '@/components/EventForm';
import { getVenues } from '@/lib/refdata';

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  const venues = await getVenues();
  return (
    <>
      <div className="page-head">
        <h1>Neues Event</h1>
      </div>
      <EventForm venues={venues} />
    </>
  );
}
