import fs from 'fs';
import path from 'path';
import { DATA_DIR, readSnapshot } from '@/lib/data';
import type { AwardsSnapshot, LeagueSnapshot, ScheduleSnapshot, TeamsSnapshot } from '@/lib/types';

export type AiNewsEntitlement = {
  unlocked: boolean;
  reason: string;
  providerReady: boolean;
  provider: 'openai' | 'none';
  mode: 'licensed' | 'env' | 'locked';
};

export type AiNewsDraftRequest = {
  seasonYear: number;
  week: number;
  weekType?: string;
  tone?: string;
};

export type AiNewsDraftResult = {
  title: string;
  dek: string;
  body: string;
  source: 'ai';
  provider: string;
  model?: string;
};

const LICENSE_FILE = 'ai-news-license.json';

function licensePath() {
  return path.join(DATA_DIR, LICENSE_FILE);
}

export function readAiNewsLicense(): { key: string; unlockedAt?: string } | null {
  const filePath = licensePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { key?: string; unlockedAt?: string };
    if (!parsed.key) return null;
    return { key: String(parsed.key), unlockedAt: parsed.unlockedAt };
  } catch {
    return null;
  }
}

export function writeAiNewsLicense(key: string) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = { key: String(key || '').trim(), unlockedAt: new Date().toISOString() };
  fs.writeFileSync(licensePath(), JSON.stringify(payload, null, 2));
  return payload;
}

export function clearAiNewsLicense() {
  const filePath = licensePath();
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

/** Accepts CFB-AI-* keys locally, or any key listed in CFB_AI_NEWS_LICENSES. */
export function isValidAiNewsLicense(key: string) {
  const trimmed = String(key || '').trim();
  if (!trimmed) return false;
  const allowed = String(process.env.CFB_AI_NEWS_LICENSES || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (allowed.includes(trimmed)) return true;
  // Local/beta unlock pattern until Stripe (or similar) is wired.
  return /^CFB-AI-[A-Z0-9]{8,}$/i.test(trimmed);
}

export function getAiNewsEntitlement(): AiNewsEntitlement {
  const openAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const providerReady = openAiKey;
  const provider = openAiKey ? 'openai' : 'none';

  // Server-wide unlock for hosted/desktop builds that ship with billing already settled.
  if (process.env.CFB_AI_NEWS_ENABLED === '1' || process.env.CFB_AI_NEWS_ENABLED === 'true') {
    return {
      unlocked: true,
      reason: 'AI News enabled for this install.',
      providerReady,
      provider,
      mode: 'env',
    };
  }

  const license = readAiNewsLicense();
  if (license && isValidAiNewsLicense(license.key)) {
    return {
      unlocked: true,
      reason: 'AI News license unlocked on this device.',
      providerReady,
      provider,
      mode: 'licensed',
    };
  }

  return {
    unlocked: false,
    reason:
      'AI News is a paid add-on. Unlock with a CFB-AI-… license key, or set CFB_AI_NEWS_ENABLED=1 for this install.',
    providerReady,
    provider,
    mode: 'locked',
  };
}

function buildWeekBrief(req: AiNewsDraftRequest) {
  const league = readSnapshot<LeagueSnapshot>('league');
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');
  const teams = readSnapshot<TeamsSnapshot>('teams');
  const awards = readSnapshot<AwardsSnapshot>('awards');

  const games = (schedule?.games || []).filter(
    (g) => g.seasonYear === req.seasonYear && g.seasonWeek === req.week
  );
  const finals = games.filter((g) => g.isFinal || g.homeScore || g.awayScore);
  const gotw = games.find((g) => g.isGameOfTheWeek) || null;
  const media = (teams?.rankings.media || []).slice(0, 10);
  const weeklyAwards = (awards?.current?.weeklyAwards || [])
    .filter((row) => !req.week || row.periodIndex == null || row.periodIndex === req.week)
    .slice(0, 8);

  return {
    seasonYear: req.seasonYear,
    week: req.week,
    weekType: req.weekType || schedule?.currentWeekType || 'RegularSeason',
    program: league?.userTeam?.label || null,
    gameCount: games.length,
    finalCount: finals.length,
    games: games.slice(0, 24).map((g) => ({
      matchup: `${g.away?.displayName || 'TBD'} @ ${g.home?.displayName || 'TBD'}`,
      score: `${g.awayScore}-${g.homeScore}`,
      final: Boolean(g.isFinal),
      gotw: Boolean(g.isGameOfTheWeek),
      network: g.broadcastNetwork || null,
    })),
    gameOfTheWeek: gotw
      ? {
          matchup: `${gotw.away?.displayName || 'TBD'} @ ${gotw.home?.displayName || 'TBD'}`,
          score: `${gotw.awayScore}-${gotw.homeScore}`,
        }
      : null,
    mediaTop10: media.map((row) => ({
      rank: row.rank,
      team: row.displayName,
      record: row.record,
    })),
    weeklyAwards: weeklyAwards.map((row) => ({
      award: row.awardLabel || row.awardType,
      player: `${row.firstName || ''} ${row.lastName || ''}`.trim(),
      team: row.teamDisplayName,
    })),
    tone: req.tone || 'broadcast desk, lively but factual college football column',
  };
}

async function generateWithOpenAi(brief: ReturnType<typeof buildWeekBrief>): Promise<AiNewsDraftResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the server.');

  const model = process.env.CFB_AI_NEWS_MODEL?.trim() || 'gpt-4.1-mini';
  const prompt = `You write short dynasty news for an offline college football desk.
Return strict JSON with keys title, dek, body (markdown-ish plain text with short paragraphs).
No preamble. Keep body under 220 words. Use only the brief facts.

BRIEF:
${JSON.stringify(brief, null, 2)}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a college football dynasty beat writer. Output JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `OpenAI request failed (${res.status})`);
  }

  const content = json?.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  const title = String(parsed?.title || '').trim();
  const dek = String(parsed?.dek || '').trim();
  const body = String(parsed?.body || '').trim();
  if (!title || !body) throw new Error('AI returned an incomplete draft.');

  return {
    title,
    dek,
    body,
    source: 'ai',
    provider: 'openai',
    model,
  };
}

export async function generateAiNewsDraft(req: AiNewsDraftRequest): Promise<AiNewsDraftResult> {
  const entitlement = getAiNewsEntitlement();
  if (!entitlement.unlocked) {
    const err = new Error(entitlement.reason) as Error & { status: number; code: string };
    err.status = 402;
    err.code = 'ai_news_locked';
    throw err;
  }
  if (!entitlement.providerReady) {
    const err = new Error(
      'License is unlocked, but no AI provider key is configured. Set OPENAI_API_KEY on the server.'
    ) as Error & { status: number; code: string };
    err.status = 503;
    err.code = 'ai_provider_missing';
    throw err;
  }

  const brief = buildWeekBrief(req);
  if (entitlement.provider === 'openai') {
    return generateWithOpenAi(brief);
  }

  const err = new Error('No supported AI provider configured.') as Error & { status: number; code: string };
  err.status = 503;
  err.code = 'ai_provider_missing';
  throw err;
}
