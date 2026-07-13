import { AwardsClient } from '@/components/AwardsClient';
import { readSnapshot } from '@/lib/data';
import type { AwardsSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default function AwardsPage() {
  const awards = readSnapshot<AwardsSnapshot>('awards');
  if (!awards) {
    return (
      <section className="section">
        <div className="sectionHead">
          <div>
            <h2>Awards</h2>
            <p>Extract a dynasty to load awards and national champions.</p>
          </div>
        </div>
        <div className="panel emptyState">No awards available. Run a full extract first.</div>
      </section>
    );
  }

  return <AwardsClient awards={awards} />;
}
