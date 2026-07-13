'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatRecord, movementLabel } from '@/lib/types';

type PollRow = {
  rank: number;
  lastWeekRank: number;
  points: number;
  firstPlaceVotes?: number;
  movement: number;
  teamIndex: number;
  displayName: string;
  record: { wins: number; losses: number; ties: number };
  conference?: { name: string } | null;
};

export function RankingsClient({
  rankings,
}: {
  rankings: { media: PollRow[]; coaches: PollRow[]; cfp: PollRow[] };
}) {
  const [poll, setPoll] = useState<'media' | 'coaches' | 'cfp'>('media');
  const rows = useMemo(() => rankings[poll] || [], [rankings, poll]);

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Polls</p>
          <h2>Rankings</h2>
          <p>Media, Coaches, and CFP polls pulled from the dynasty Team table.</p>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['media', 'Media'],
            ['coaches', 'Coaches'],
            ['cfp', 'CFP'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="tab"
            data-active={poll === key}
            onClick={() => setPoll(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Record</th>
              <th>Conf</th>
              <th>Pts</th>
              <th>Move</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${poll}-${row.teamIndex}`}>
                <td>{row.rank}</td>
                <td>
                  <Link href={`/teams/${row.teamIndex}`}>{row.displayName}</Link>
                </td>
                <td>{formatRecord(row.record.wins, row.record.losses, row.record.ties)}</td>
                <td>{row.conference?.name || '—'}</td>
                <td>{row.points}</td>
                <td
                  className={
                    row.movement > 0 ? 'movementUp' : row.movement < 0 ? 'movementDown' : undefined
                  }
                >
                  {movementLabel(row.movement)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>No ranked teams in this poll yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
