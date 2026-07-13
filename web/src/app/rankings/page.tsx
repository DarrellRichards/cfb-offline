import { RankingsClient } from '@/components/RankingsClient';
import { readSnapshot } from '@/lib/data';
import type { TeamsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

  return (
    <RankingsClient
      rankings={{
        media: teams.rankings.media as never,
        coaches: teams.rankings.coaches as never,
        cfp: teams.rankings.cfp as never,
      }}
    />
  );
}
