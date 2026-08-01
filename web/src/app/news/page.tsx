import { NewsClient } from '@/components/NewsClient';
import { listNewsArticles, newsSeasonYears, readNewsStore } from '@/lib/news';
import { readSnapshot } from '@/lib/data';
import type { AwardsSnapshot, LeagueSnapshot, ScheduleSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function NewsPage() {
  const league = readSnapshot<LeagueSnapshot>('league');
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');
  const awards = readSnapshot<AwardsSnapshot>('awards');

  const fallbackYears = [
    league?.season?.currentSeasonYear,
    ...(awards?.seasonYears || []),
    ...((schedule?.games || []).map((g) => g.seasonYear) || []),
  ].filter((y): y is number => Number.isFinite(y as number) && (y as number) > 0);

  const seasonYears = newsSeasonYears(fallbackYears);
  const currentSeasonYear = league?.season?.currentSeasonYear || seasonYears[0] || new Date().getFullYear();
  const currentWeek = schedule?.currentWeek ?? league?.season?.currentWeek ?? 1;
  const currentWeekType = schedule?.currentWeekType || league?.season?.currentWeekType || 'RegularSeason';

  const weeks = [
    ...new Set([
      ...(schedule?.weeks || []),
      ...((schedule?.games || [])
        .filter((g) => g.seasonYear === currentSeasonYear)
        .map((g) => g.seasonWeek) || []),
      ...readNewsStore()
        .articles.filter((a) => a.seasonYear === currentSeasonYear)
        .map((a) => a.week),
      currentWeek,
    ]),
  ]
    .filter((w) => Number.isFinite(w) && w >= 0)
    .sort((a, b) => a - b);

  const articles = listNewsArticles({ seasonYear: currentSeasonYear, week: currentWeek });

  return (
    <NewsClient
      initial={{
        seasonYears,
        currentSeasonYear,
        currentWeek,
        currentWeekType,
        weeks,
        articles,
      }}
    />
  );
}
