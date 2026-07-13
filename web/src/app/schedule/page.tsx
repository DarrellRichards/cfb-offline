import { ScheduleClient } from '@/components/ScheduleClient';
import { readSnapshot } from '@/lib/data';
import type { ScheduleSnapshot, TeamsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function SchedulePage() {
  const schedule = readSnapshot<ScheduleSnapshot>('schedule');
  const teams = readSnapshot<TeamsSnapshot>('teams');

  if (!schedule) {
    return (
      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Schedule</h2>
            <p>Extract a dynasty to load the slate.</p>
          </div>
        </div>
        <div className="panel emptyState">No schedule data available.</div>
      </section>
    );
  }

  const conferences = (teams?.conferences || []).map((c) => c.name).filter(Boolean);

  return (
    <ScheduleClient
      schedule={schedule}
      conferences={conferences}
      teamConferenceByIndex={Object.fromEntries(
        (teams?.teams || []).map((t) => [t.teamIndex, t.conference?.name || ''])
      )}
    />
  );
}
