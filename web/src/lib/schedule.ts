import type { ScheduleGame } from '@/lib/types';

/** Turn save statuses like "Home Won" / "Away Won" into the winning team's name. */
export function formatGameStatus(game: ScheduleGame): string {
  if (!game.isFinal) return 'Upcoming';

  const status = String(game.gameStatus || '').trim();
  const lower = status.toLowerCase();
  const homeName = game.home?.displayName || 'Home';
  const awayName = game.away?.displayName || 'Away';

  if (lower.includes('tie') || lower.includes('draw')) return 'Tie';

  if (lower.includes('home') && lower.includes('won')) return `${homeName} won`;
  if (lower.includes('away') && lower.includes('won')) return `${awayName} won`;

  if (game.homeScore > game.awayScore) return `${homeName} won`;
  if (game.awayScore > game.homeScore) return `${awayName} won`;
  if (game.homeScore === game.awayScore && (game.homeScore > 0 || game.awayScore > 0)) {
    return 'Tie';
  }

  return status || 'Final';
}
