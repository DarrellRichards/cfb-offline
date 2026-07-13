import { TeamsClient } from '@/components/TeamsClient';
import { readSnapshot } from '@/lib/data';
import type { TeamsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function TeamsPage() {
  const data = readSnapshot<TeamsSnapshot>('teams');
  if (!data) {
    return (
      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Teams</h2>
            <p>Extract a dynasty to load the team directory.</p>
          </div>
        </div>
        <div className="panel emptyState">No teams available.</div>
      </section>
    );
  }

  return (
    <TeamsClient
      teams={data.teams}
      conferences={data.conferences
        .map((c) => c.name)
        .filter((name) => name && !/^FCS\b/i.test(name))}
    />
  );
}
