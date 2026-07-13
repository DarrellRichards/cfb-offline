import { RecruitingClient } from '@/components/RecruitingClient';
import { readSnapshot } from '@/lib/data';
import type { RecruitBoardSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function RecruitingPage() {
  const board = readSnapshot<RecruitBoardSnapshot>('recruits');

  if (!board) {
    return (
      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Recruiting</h2>
            <p>Extract a dynasty to load the recruit board.</p>
          </div>
        </div>
        <div className="panel emptyState">No recruiting data available.</div>
      </section>
    );
  }

  return (
    <RecruitingClient
      recruits={board.recruits as never}
      teamContext={(board.teamContext || {}) as never}
      savePath={board.savePath || ''}
      generatedAt={board.generatedAt || ''}
    />
  );
}
