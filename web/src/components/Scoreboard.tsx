import type { ScheduleGame } from '@/lib/types';
import { formatGameStatus } from '@/lib/schedule';

export function Scoreboard({ game, featured = false }: { game: ScheduleGame; featured?: boolean }) {
  const showScore = game.isFinal || game.awayScore > 0 || game.homeScore > 0;

  return (
    <div className={`panel scoreboard ${featured ? 'scoreboardFeatured' : ''}`}>
      <div className="scoreboardGlow" aria-hidden />
      <div className="scoreSide away">
        <div className="scoreRole">Away</div>
        <div className="scoreName">{game.away?.displayName || 'Away'}</div>
        <div className="scoreNick">{game.away?.nickname || '—'}</div>
        <div className="scoreValue">{showScore ? game.awayScore : '—'}</div>
      </div>
      <div className="scoreCenter">
        <div className="scoreWeek">Week {game.seasonWeek}</div>
        <div className="scoreDate">
          {game.dayOfWeek || 'Gameday'}
          {game.gameDateMonth ? ` · ${game.gameDateMonth}/${game.gameDateDay}` : ''}
        </div>
        <div className="scoreStatus">{formatGameStatus(game)}</div>
        {game.isGameOfTheWeek && <div className="scoreBadge">GOTW</div>}
      </div>
      <div className="scoreSide home">
        <div className="scoreRole">Home</div>
        <div className="scoreName">{game.home?.displayName || 'Home'}</div>
        <div className="scoreNick">{game.home?.nickname || '—'}</div>
        <div className="scoreValue">{showScore ? game.homeScore : '—'}</div>
      </div>
    </div>
  );
}
