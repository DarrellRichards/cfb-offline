import { NextRequest, NextResponse } from 'next/server';
import {
  createNewsArticle,
  deleteNewsArticle,
  listNewsArticles,
  newsSeasonYears,
  readNewsStore,
  updateNewsArticle,
} from '@/lib/news';
import { readSnapshot } from '@/lib/data';
import type { AwardsSnapshot, LeagueSnapshot, ScheduleSnapshot } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const seasonYearRaw = req.nextUrl.searchParams.get('seasonYear');
    const weekRaw = req.nextUrl.searchParams.get('week');
    const seasonYear = seasonYearRaw != null && seasonYearRaw !== '' ? Number(seasonYearRaw) : undefined;
    const week = weekRaw != null && weekRaw !== '' ? Number(weekRaw) : undefined;

    const league = readSnapshot<LeagueSnapshot>('league');
    const schedule = readSnapshot<ScheduleSnapshot>('schedule');
    const awards = readSnapshot<AwardsSnapshot>('awards');

    const fallbackYears = [
      league?.season?.currentSeasonYear,
      ...(awards?.seasonYears || []),
      ...((schedule?.games || []).map((g) => g.seasonYear) || []),
    ].filter((y): y is number => Number.isFinite(y as number) && (y as number) > 0);

    const articles = listNewsArticles({
      seasonYear: Number.isFinite(seasonYear as number) ? seasonYear : undefined,
      week: Number.isFinite(week as number) ? week : undefined,
    });

    const weeksFromSchedule = [
      ...new Set(
        (schedule?.games || [])
          .filter((g) => (seasonYear == null || !Number.isFinite(seasonYear) ? true : g.seasonYear === seasonYear))
          .map((g) => g.seasonWeek)
          .filter((w) => Number.isFinite(w))
      ),
    ].sort((a, b) => a - b);

    const weeksFromArticles = [
      ...new Set(
        readNewsStore()
          .articles.filter((a) =>
            seasonYear == null || !Number.isFinite(seasonYear) ? true : a.seasonYear === seasonYear
          )
          .map((a) => a.week)
      ),
    ];

    const weeks = [...new Set([...weeksFromSchedule, ...weeksFromArticles, ...(schedule?.weeks || [])])]
      .filter((w) => Number.isFinite(w) && w >= 0)
      .sort((a, b) => a - b);

    return NextResponse.json({
      ok: true,
      storeUpdatedAt: readNewsStore().updatedAt,
      seasonYears: newsSeasonYears(fallbackYears),
      currentSeasonYear: league?.season?.currentSeasonYear || fallbackYears[0] || null,
      currentWeek: schedule?.currentWeek ?? league?.season?.currentWeek ?? null,
      currentWeekType: schedule?.currentWeekType || league?.season?.currentWeekType || 'RegularSeason',
      weeks,
      articles,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const article = createNewsArticle(body);
    return NextResponse.json({ ok: true, article });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
    const article = updateNewsArticle(id, body);
    return NextResponse.json({ ok: true, article });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === 'Article not found.' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || req.nextUrl.searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
    const result = deleteNewsArticle(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === 'Article not found.' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
