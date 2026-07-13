import { readSnapshot } from '@/lib/data';
import { formatNumber, humanizeLabel } from '@/lib/format';
import { formatGameStatus } from '@/lib/schedule';
import type { ScheduleSnapshot } from '@/lib/types';
import { Scoreboard } from '@/components/Scoreboard';

export const dynamic = 'force-dynamic';

export default function GotwPage() {
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');

  if (!schedule?.gameOfTheWeek) {
    return (
      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Game of the Week</h2>
            <p>Extract a dynasty to load the featured matchup.</p>
          </div>
        </div>
        <div className="panel emptyState">No GOTW data available.</div>
      </section>
    );
  }

  const game = schedule.gameOfTheWeek;
  const seasonYear = game.seasonYear;
  const pastGotw = schedule.games
    .filter(
      (g) =>
        g.isGameOfTheWeek &&
        g.seasonYear === seasonYear &&
        g.seasonWeek < schedule.currentWeek
    )
    .sort((a, b) => b.seasonWeek - a.seasonWeek || a.seasonGameNum - b.seasonGameNum);

  const quarters = game.quarters;
  const hasQuarters =
    Boolean(quarters?.home?.some(Boolean)) || Boolean(quarters?.away?.some(Boolean));

  return (
    <>
      <section className="section" style={{ marginTop: 8 }}>
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Featured matchup</p>
            <h2>Game of the Week</h2>
            <p>
              Week {schedule.currentWeek} · {schedule.currentWeekType}
              {game.isGameOfTheWeek ? ' · Official GOTW flag' : ' · Highest GOTW score this week'}
            </p>
          </div>
        </div>
        <Scoreboard game={game} featured />
      </section>

      <section className="section">
        <div className="detailGrid">
          <div className="statTile">
            <span>Weather</span>
            <strong style={{ fontSize: '1.2rem' }}>{humanizeLabel(game.weather) || '—'}</strong>
          </div>
          <div className="statTile">
            <span>Temp</span>
            <strong>{game.temperature || '—'}°</strong>
          </div>
          <div className="statTile">
            <span>Broadcast</span>
            <strong style={{ fontSize: '1.2rem' }}>{game.broadcastNetwork || '—'}</strong>
          </div>
          <div className="statTile">
            <span>Attendance</span>
            <strong>{game.attendance ? formatNumber(game.attendance) : '—'}</strong>
          </div>
          <div className="statTile">
            <span>GOTW Score</span>
            <strong>{game.gameOfTheWeekScore}</strong>
          </div>
        </div>
      </section>

      {hasQuarters && quarters && (
        <section className="section">
          <div className="sectionHead">
            <div>
              <h2>By Quarter</h2>
              <p>Scoring by period from the dynasty box score.</p>
            </div>
          </div>
          <div className="panel tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Q1</th>
                  <th>Q2</th>
                  <th>Q3</th>
                  <th>Q4</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{game.away?.displayName}</td>
                  {(quarters.away || []).map((q, i) => (
                    <td key={`a${i}`}>{q}</td>
                  ))}
                  <td>{game.awayScore}</td>
                </tr>
                <tr>
                  <td>{game.home?.displayName}</td>
                  {(quarters.home || []).map((q, i) => (
                    <td key={`h${i}`}>{q}</td>
                  ))}
                  <td>{game.homeScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Past Games of the Week</h2>
            <p>
              Official GOTW matchups earlier in the {seasonYear || 'current'} season.
            </p>
          </div>
        </div>
        <div className="panel tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Week</th>
                <th>Matchup</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pastGotw.map((g) => (
                <tr key={g.row}>
                  <td>{g.seasonWeek}</td>
                  <td>
                    {g.away?.displayName} @ {g.home?.displayName}
                  </td>
                  <td>
                    {g.isFinal || g.awayScore || g.homeScore
                      ? `${g.awayScore}-${g.homeScore}`
                      : '—'}
                  </td>
                  <td>{formatGameStatus(g)}</td>
                </tr>
              ))}
              {pastGotw.length === 0 && (
                <tr>
                  <td colSpan={4}>No earlier Games of the Week this season yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
