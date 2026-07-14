'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatRecord, movementLabel } from '@/lib/types';
import { useExtract } from './ExtractProvider';
import { useSettings } from './SettingsProvider';

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
type EditablePoll = 'media' | 'coaches';

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

function isEditablePoll(poll: RankingBoard): poll is EditablePoll {
  return poll === 'media' || poll === 'coaches';
}

export function RankingsClient({
  rankings,
  savePath,
  allTeams = [],
}: {
  rankings: {
    media: PollRow[];
    coaches: PollRow[];
    cfp: PollRow[];
    totalOffense?: PollRow[];
    totalDefense?: PollRow[];
  };
  savePath: string;
  allTeams?: Array<{
    teamIndex: number;
    displayName: string;
    record: { wins: number; losses: number; ties: number };
    conference?: { name: string } | null;
  }>;
}) {
  const router = useRouter();
  const { extractPath } = useExtract();
  const { settings } = useSettings();
  const allowRankingEdits = settings.rankingEdits;
  const [poll, setPoll] = useState<RankingBoard>('media');
  const meta = BOARD_META[poll];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PollRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [swapTeamIndex, setSwapTeamIndex] = useState('');
  const [swapAtRank, setSwapAtRank] = useState('25');

  const sourceRows = useMemo(() => {
    const source = rankings[poll] || [];
    return source.filter((row) => !isFcsShell(row.displayName));
  }, [rankings, poll]);

  useEffect(() => {
    setEditing(false);
    setDraft([]);
    setStatus('');
  }, [poll]);

  useEffect(() => {
    if (!allowRankingEdits && editing) {
      setEditing(false);
      setDraft([]);
      setStatus('');
    }
  }, [allowRankingEdits, editing]);

  const canEdit = allowRankingEdits && isEditablePoll(poll);
  const rows = editing && canEdit ? draft : sourceRows;

  const swapCandidates = useMemo(() => {
    if (!editing) return [];
    const used = new Set(draft.map((r) => r.teamIndex));
    return allTeams
      .filter((t) => !isFcsShell(t.displayName) && !used.has(t.teamIndex))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allTeams, draft, editing]);

  function beginEdit() {
    if (!canEdit) return;
    setDraft(sourceRows.map((row) => ({ ...row })));
    setEditing(true);
    setStatus('');
  }

  function cancelEdit() {
    setEditing(false);
    setDraft([]);
    setStatus('');
  }

  function moveRow(index: number, delta: number) {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next.map((row, idx) => ({
        ...row,
        rank: idx + 1,
        movement: row.lastWeekRank > 0 ? row.lastWeekRank - (idx + 1) : 0,
      }));
    });
  }

  function removeRow(index: number) {
    setDraft((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((row, idx) => ({
          ...row,
          rank: idx + 1,
          movement: row.lastWeekRank > 0 ? row.lastWeekRank - (idx + 1) : 0,
        }))
    );
  }

  function insertTeam() {
    const teamIndex = Number(swapTeamIndex);
    const atRank = Math.max(1, Math.min(25, Number(swapAtRank) || draft.length + 1));
    const team = allTeams.find((t) => t.teamIndex === teamIndex);
    if (!team) {
      setStatus('Pick a team to insert.');
      return;
    }
    if (draft.some((r) => r.teamIndex === teamIndex)) {
      setStatus('That team is already ranked.');
      return;
    }
    if (draft.length >= 25 && atRank > draft.length) {
      setStatus('Board already has 25 teams. Remove one or replace a rank.');
      return;
    }

    setDraft((prev) => {
      const insertIndex = Math.min(Math.max(atRank - 1, 0), Math.max(prev.length, 0));
      const withoutDup = prev.filter((r) => r.teamIndex !== teamIndex);
      const next = [...withoutDup];
      const row: PollRow = {
        rank: insertIndex + 1,
        lastWeekRank: 0,
        points: Math.max(0, (26 - (Math.min(insertIndex, 24) + 1)) * 40),
        firstPlaceVotes: 0,
        movement: 0,
        teamIndex: team.teamIndex,
        displayName: team.displayName,
        record: team.record,
        conference: team.conference,
      };
      if (next.length >= 25) {
        const clamped = Math.min(insertIndex, 24);
        next.splice(clamped, 1, row);
      } else {
        next.splice(Math.min(insertIndex, next.length), 0, row);
      }
      return next.slice(0, 25).map((item, idx) => ({
        ...item,
        rank: idx + 1,
        movement: item.lastWeekRank > 0 ? item.lastWeekRank - (idx + 1) : 0,
      }));
    });
    setStatus(`Inserted ${team.displayName} at #${atRank}.`);
  }

  async function savePoll() {
    if (!canEdit || !isEditablePoll(poll)) return;
    if (!savePath) {
      setStatus('No dynasty save path on this extract. Re-extract first.');
      return;
    }
    setBusy(true);
    setStatus('Writing poll rankings to save…');
    try {
      const entries = draft.map((row, idx) => ({
        teamIndex: row.teamIndex,
        points: row.points,
        firstPlaceVotes: row.firstPlaceVotes || 0,
        // rank inferred from order server-side
        rank: idx + 1,
      }));
      const res = await fetch('/api/team/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savePath, poll, entries }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Poll update failed');

      setStatus(
        `Saved ${poll} poll (${json.changed ?? entries.length} changes). Refreshing teams extract…`
      );
      await extractPath(savePath, 'teams');
      setEditing(false);
      setDraft([]);
      router.refresh();
      setStatus(`Saved ${poll} poll to dynasty. Backup: ${json.backupPath || 'none'}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Polls & unit ranks</p>
          <h2>Rankings</h2>
          <p>{meta.description}.</p>
        </div>
        {canEdit && (
          <div className="row">
            {!editing ? (
              <button type="button" className="button" onClick={beginEdit} disabled={busy}>
                Edit {BOARD_META[poll].label} poll
              </button>
            ) : (
              <>
                <button type="button" className="buttonGhost" onClick={cancelEdit} disabled={busy}>
                  Cancel
                </button>
                <button type="button" className="button" onClick={savePoll} disabled={busy || draft.length === 0}>
                  {busy ? 'Saving…' : 'Save to dynasty'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="tabs">
        {(Object.keys(BOARD_META) as RankingBoard[]).map((key) => (
          <button
            key={key}
            type="button"
            className="tab"
            data-active={poll === key}
            onClick={() => setPoll(key)}
            disabled={busy}
          >
            {BOARD_META[key].label}
          </button>
        ))}
      </div>

      {editing && canEdit && (
        <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>Reorder or swap teams</strong>
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
            Move teams with ↑/↓, remove a slot, or insert another program at a rank. Saves write Media
            / Coaches poll fields back to your dynasty (with a CFBOfflineBackups copy first). Teams
            leaving the top 25 are moved to rank 26+ — never rank 0.
          </p>
          <div className="row">
            <select
              value={swapTeamIndex}
              onChange={(e) => setSwapTeamIndex(e.target.value)}
              style={{ minWidth: 220 }}
            >
              <option value="">Insert team…</option>
              {swapCandidates.map((t) => (
                <option key={t.teamIndex} value={String(t.teamIndex)}>
                  {t.displayName}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={25}
              value={swapAtRank}
              onChange={(e) => setSwapAtRank(e.target.value)}
              placeholder="Rank"
              style={{ width: 88 }}
              aria-label="Insert at rank"
            />
            <button type="button" className="buttonGhost" onClick={insertTeam} disabled={busy}>
              Insert
            </button>
          </div>
          {status ? <p style={{ margin: '12px 0 0' }}>{status}</p> : null}
        </div>
      )}

      {!editing && status ? (
        <p className="panel" style={{ padding: 12, marginBottom: 12 }}>
          {status}
        </p>
      ) : null}

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
              {editing && canEdit ? <th>Edit</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${poll}-${row.teamIndex}`}>
                <td>{editing ? idx + 1 : row.rank}</td>
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
                {editing && canEdit ? (
                  <td>
                    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <button
                        type="button"
                        className="buttonGhost"
                        aria-label="Move up"
                        disabled={busy || idx === 0}
                        onClick={() => moveRow(idx, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="buttonGhost"
                        aria-label="Move down"
                        disabled={busy || idx === rows.length - 1}
                        onClick={() => moveRow(idx, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="buttonGhost"
                        aria-label="Remove"
                        disabled={busy}
                        onClick={() => removeRow(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={(meta.kind === 'poll' || meta.kind === 'yards' ? 6 : 5) + (editing ? 1 : 0)}>
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
