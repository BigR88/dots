import { notFound } from 'next/navigation';
import { EventForm } from '@/components/EventForm';
import { getVenues } from '@/lib/refdata';
import { getEvent } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, venues] = await Promise.all([getEvent(id), getVenues()]);
  if (!event) notFound();

  return (
    <>
      <div className="page-head">
        <h1>Event bearbeiten</h1>
        <span className="meta">{event.id}</span>
      </div>
      <EventForm event={event} venues={venues} />
    </>
  );
}
