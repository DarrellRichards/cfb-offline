import Link from 'next/link';
import { readSnapshot } from '@/lib/data';
import { formatGameStatus } from '@/lib/schedule';
import type { ScheduleSnapshot, TeamsSnapshot } from '@/lib/types';
import { formatRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamIndex: string }>;
}) {
  const { teamIndex: teamIndexRaw } = await params;
  const teamIndex = Number(teamIndexRaw);
  const teams = readSnapshot<TeamsSnapshot>('teams');
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');
  const team = teams?.teams.find((t) => t.teamIndex === teamIndex);

  if (!team) {
    return (
      <section className="section">
        <div className="panel emptyState">Team not found. Extract a dynasty or pick another program.</div>
      </section>
    );
  }

  const upcoming = (schedule?.games || [])
    .filter(
      (g) =>
        (g.home?.teamIndex === teamIndex || g.away?.teamIndex === teamIndex) &&
        g.seasonWeek >= (schedule?.currentWeek || 0)
    )
    .slice(0, 8);

  return (
    <>
      <section className="section" style={{ marginTop: 8 }}>
        <div className="sectionHead">
          <div>
            <h2>{team.label}</h2>
            <p>
              {team.conference?.name || 'Independent'} ·{' '}
              {formatRecord(team.record.wins, team.record.losses, team.record.ties)}
            </p>
          </div>
          <Link href="/teams" className="buttonGhost">
            All teams
          </Link>
        </div>

        <div className="detailGrid">
          <div className="statTile">
            <span>Overall</span>
            <strong>{team.ratings.overall}</strong>
          </div>
          <div className="statTile">
            <span>Offense</span>
            <strong>{team.ratings.offense}</strong>
          </div>
          <div className="statTile">
            <span>Defense</span>
            <strong>{team.ratings.defense}</strong>
          </div>
          <div className="statTile">
            <span>Media Poll</span>
            <strong>{team.polls.media.rank || '—'}</strong>
          </div>
          <div className="statTile">
            <span>Coaches Poll</span>
            <strong>{team.polls.coaches.rank || '—'}</strong>
          </div>
          <div className="statTile">
            <span>CFP</span>
            <strong>{team.polls.cfp.rank || '—'}</strong>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Unit Ratings</h2>
            <p>Position group ratings from the Team table.</p>
          </div>
        </div>
        <div className="detailGrid">
          {(['qb', 'rb', 'wr', 'te', 'ol', 'dl', 'lb', 'db', 'st'] as const).map((key) => (
            <div className="statTile" key={key}>
              <span>{key.toUpperCase()}</span>
              <strong>{team.ratings[key] || '—'}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Upcoming / Recent</h2>
            <p>Games involving this program from the schedule extract.</p>
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
              {upcoming.map((g) => (
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
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={4}>No games found for this team.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
