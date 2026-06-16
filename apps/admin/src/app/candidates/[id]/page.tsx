import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CandidateReview } from '@/components/CandidateReview';
import { getCandidate } from '@/lib/candidates-store';
import { getEvent } from '@/lib/store';
import { getVenues } from '@/lib/refdata';
import { CANDIDATE_STATUS_LABELS } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [candidate, venues] = await Promise.all([getCandidate(id), getVenues()]);
  if (!candidate) notFound();

  const dup = candidate.possibleDuplicateOf ? await getEvent(candidate.possibleDuplicateOf) : null;

  return (
    <>
      <div className="page-head">
        <h1>Kandidat prüfen</h1>
        <span className="meta">
          <Link href="/candidates">← zurück</Link> · Status: {CANDIDATE_STATUS_LABELS[candidate.status]}
        </span>
      </div>

      {sp.err && <div className="notice err">⚠ {sp.err}</div>}

      <CandidateReview candidate={candidate} venues={venues} duplicateLabel={dup?.title} />
    </>
  );
}
