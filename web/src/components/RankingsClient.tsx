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
  rating?: number;
  yardsPerGame?: number;
  teamIndex: number;
  displayName: string;
  record: { wins: number; losses: number; ties: number };
  conference?: { name: string } | null;
};

type RankingBoard = 'media' | 'coaches' | 'cfp' | 'totalOffense' | 'totalDefense';

const BOARD_META: Record<
  RankingBoard,
  { label: string; kind: 'poll' | 'unit' | 'yards'; description: string }
> = {
  media: { label: 'Media', kind: 'poll', description: 'AP-style media poll' },
  coaches: { label: 'Coaches', kind: 'poll', description: 'Coaches poll' },
  cfp: { label: 'CFP', kind: 'poll', description: 'College Football Playoff ranking' },
  totalOffense: { label: 'Total Offense', kind: 'unit', description: 'Team offensive rank from the dynasty' },
  totalDefense: {
    label: 'Total Defense',
    kind: 'yards',
    description: 'Fewest yards allowed (pass + rush) this season',
  },
};

function isFcsShell(name: string) {
  return /^FCS\b/i.test(name || '');
}

export function RankingsClient({
  rankings,
}: {
  rankings: {
    media: PollRow[];
    coaches: PollRow[];
    cfp: PollRow[];
    totalOffense?: PollRow[];
    totalDefense?: PollRow[];
  };
}) {
  const [poll, setPoll] = useState<RankingBoard>('media');
  const meta = BOARD_META[poll];
  const rows = useMemo(() => {
    const source = rankings[poll] || [];
    return source.filter((row) => !isFcsShell(row.displayName));
  }, [rankings, poll]);

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Polls & unit ranks</p>
          <h2>Rankings</h2>
          <p>{meta.description}.</p>
        </div>
      </div>

      <div className="tabs">
        {(Object.keys(BOARD_META) as RankingBoard[]).map((key) => (
          <button
            key={key}
            type="button"
            className="tab"
            data-active={poll === key}
            onClick={() => setPoll(key)}
          >
            {BOARD_META[key].label}
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
              {meta.kind === 'poll' ? (
                <>
                  <th>Pts</th>
                  <th>Move</th>
                </>
              ) : meta.kind === 'yards' ? (
                <>
                  <th>Yds Allowed</th>
                  <th>Yds/G</th>
                </>
              ) : (
                <th>Unit OVR</th>
              )}
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
                {meta.kind === 'poll' ? (
                  <>
                    <td>{row.points}</td>
                    <td
                      className={
                        row.movement > 0 ? 'movementUp' : row.movement < 0 ? 'movementDown' : undefined
                      }
                    >
                      {movementLabel(row.movement)}
                    </td>
                  </>
                ) : meta.kind === 'yards' ? (
                  <>
                    <td>{row.rating || row.points || 0}</td>
                    <td>{row.yardsPerGame ?? '—'}</td>
                  </>
                ) : (
                  <td>{row.rating || row.points || '—'}</td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={meta.kind === 'poll' || meta.kind === 'yards' ? 6 : 5}>
                  No ranked teams in this board yet
                  {poll === 'totalDefense' || poll === 'totalOffense'
                    ? ' — refresh/extract to rebuild unit ranks.'
                    : '.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
