import { StatsClient } from '@/components/StatsClient';
import { readSnapshot } from '@/lib/data';
import type { StatsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function StatsPage() {
  const stats = readSnapshot<StatsSnapshot>('stats');
  if (!stats) {
    return (
      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Stats</h2>
            <p>Extract a dynasty to load season leaders.</p>
          </div>
        </div>
        <div className="panel emptyState">No stats available.</div>
      </section>
    );
  }

  return (
    <StatsClient
      leaders={stats.leaders as never}
      teamRankings={(stats.teamRankings || {}) as never}
      playerCount={stats.playerCount}
    />
  );
}
