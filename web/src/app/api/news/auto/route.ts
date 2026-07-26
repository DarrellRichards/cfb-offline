import { NextRequest, NextResponse } from 'next/server';
import { generateAutoNewsForCurrentWeek } from '@/lib/auto-news';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const enabled = body.enabled !== false && body.enabled !== 0 && body.enabled !== '0';
    if (!enabled) {
      return NextResponse.json({
        ok: true,
        created: [],
        skipped: 0,
        message: 'Auto news is disabled in settings.',
      });
    }

    const count = Number(body.count);
    const result = generateAutoNewsForCurrentWeek({
      count: Number.isFinite(count) ? count : 5,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
