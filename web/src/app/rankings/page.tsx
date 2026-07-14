import { RankingsClient } from '@/components/RankingsClient';
import { readSnapshot } from '@/lib/data';
import type { TeamRecord, TeamsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

function isFcsShell(team: TeamRecord) {
  return /^FCS\b/i.test(team.displayName || '') || /^FCS\b/i.test(team.label || '');
}

function unitBoardFromTeams(teams: TeamRecord[], rankKey: 'offensiveRank' | 'defensiveRank') {
  const ratingKey = rankKey === 'defensiveRank' ? 'defense' : 'offense';
  return teams
    .filter((t) => !isFcsShell(t) && Number(t.ratings?.[rankKey]) > 0)
    .sort((a, b) => Number(a.ratings[rankKey]) - Number(b.ratings[rankKey]))
    .map((t) => ({
      rank: Number(t.ratings[rankKey]),
      lastWeekRank: 0,
      points: Number(t.ratings[ratingKey]) || 0,
      firstPlaceVotes: 0,
      movement: 0,
      rating: Number(t.ratings[ratingKey]) || 0,
      teamIndex: t.teamIndex,
      displayName: t.displayName,
      record: t.record,
      conference: t.conference,
    }));
}

export default function RankingsPage() {
  const teams = readSnapshot<TeamsSnapshot>('teams');
  if (!teams) {
    return (
      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Rankings</h2>
            <p>Extract a dynasty to load poll data.</p>
          </div>
        </div>
        <div className="panel emptyState">No rankings available.</div>
      </section>
    );
  }

  const totalOffense =
    (teams.rankings.totalOffense as never) || unitBoardFromTeams(teams.teams, 'offensiveRank');
  // Prefer yards-allowed board from extract; DefensiveRank fallback is overall, not yards.
  const totalDefense = (teams.rankings.totalDefense as never) || [];

  return (
    <RankingsClient
      savePath={teams.savePath || ''}
      allTeams={teams.teams.map((t) => ({
        teamIndex: t.teamIndex,
        displayName: t.displayName,
        record: t.record,
        conference: t.conference,
      }))}
      rankings={{
        media: teams.rankings.media as never,
        coaches: teams.rankings.coaches as never,
        cfp: teams.rankings.cfp as never,
        totalOffense,
        totalDefense,
      }}
    />
  );
}
