import { NextRequest, NextResponse } from 'next/server';
import {
  clearAiNewsLicense,
  generateAiNewsDraft,
  getAiNewsEntitlement,
  isValidAiNewsLicense,
  writeAiNewsLicense,
} from '@/lib/ai-news';
import { createNewsArticle } from '@/lib/news';

export async function GET() {
  return NextResponse.json({ ok: true, entitlement: getAiNewsEntitlement() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'generate').trim();

    if (action === 'unlock') {
      const key = String(body.licenseKey || '').trim();
      if (!isValidAiNewsLicense(key)) {
        return NextResponse.json(
          {
            error:
              'Invalid license key. Use a CFB-AI-… key, or configure CFB_AI_NEWS_LICENSES on the server.',
          },
          { status: 400 }
        );
      }
      writeAiNewsLicense(key);
      return NextResponse.json({ ok: true, entitlement: getAiNewsEntitlement() });
    }

    if (action === 'lock') {
      clearAiNewsLicense();
      return NextResponse.json({ ok: true, entitlement: getAiNewsEntitlement() });
    }

    const seasonYear = Number(body.seasonYear);
    const week = Number(body.week);
    const weekType = String(body.weekType || 'RegularSeason');
    const save = Boolean(body.save);
    const tone = String(body.tone || '').trim();

    const draft = await generateAiNewsDraft({ seasonYear, week, weekType, tone });
    let article = null;
    if (save) {
      article = createNewsArticle({
        seasonYear,
        week,
        weekType,
        title: draft.title,
        dek: draft.dek,
        body: draft.body,
        source: 'ai',
      });
    }

    return NextResponse.json({ ok: true, draft, article, entitlement: getAiNewsEntitlement() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = typeof (err as { status?: number })?.status === 'number' ? (err as { status: number }).status : 500;
    const code = (err as { code?: string })?.code || 'ai_news_error';
    return NextResponse.json({ error: message, code }, { status });
  }
}
