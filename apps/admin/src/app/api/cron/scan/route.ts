import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { scanDueSources } from '@/lib/importer/pipeline';

/** Längen-sicherer, konstant-zeitiger Vergleich (kein Timing-Leak des Secrets). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Cron-Endpunkt: scannt alle fälligen, aktiven Quellen (gemäß check_frequency).
 * Auth per Shared Secret (Header `Authorization: Bearer <CRON_SECRET>`).
 *
 * Aufrufen z. B. von:
 *  - Supabase pg_cron + pg_net (HTTP-POST auf diese URL),
 *  - Vercel Cron / GitHub Actions / n8n / Make / system-cron (curl).
 * Beispiel:
 *   curl -X POST https://<admin-host>/api/cron/scan \
 *        -H "Authorization: Bearer $CRON_SECRET"
 *
 * Ohne gesetztes CRON_SECRET ist der Endpunkt deaktiviert (503).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // KI-Extraktion über mehrere Quellen kann dauern

async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET ist nicht konfiguriert.' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await scanDueSources();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const GET = handle;
