'use client';

import { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/format';

type Leader = {
  rank: number;
  firstName: string;
  lastName: string;
  position: string;
  teamDisplayName: string;
  value: number;
};

type TeamRank = {
  displayName: string;
  passYards?: number;
  rushYards?: number;
  totalYards?: number;
  sacks?: number;
  ints?: number;
  defYards?: number;
  yardsPerGame?: number;
  games?: number;
};

const PLAYER_TABS: Array<{ key: string; label: string }> = [
  { key: 'passingYards', label: 'Pass Yds' },
  { key: 'passingTds', label: 'Pass TD' },
  { key: 'rushingYards', label: 'Rush Yds' },
  { key: 'rushingTds', label: 'Rush TD' },
  { key: 'receivingYards', label: 'Rec Yds' },
  { key: 'receptions', label: 'Receptions' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'sacks', label: 'Sacks' },
  { key: 'interceptions', label: 'INTs' },
  { key: 'fieldGoals', label: 'FG Made' },
];

const TEAM_TABS: Array<{
  key: string;
  label: string;
  valueKey: keyof TeamRank;
}> = [
  { key: 'totalOffense', label: 'Total Off', valueKey: 'totalYards' },
  { key: 'totalDefense', label: 'Total Def', valueKey: 'defYards' },
  { key: 'passYards', label: 'Pass Yds', valueKey: 'passYards' },
  { key: 'rushYards', label: 'Rush Yds', valueKey: 'rushYards' },
  { key: 'sacks', label: 'Sacks', valueKey: 'sacks' },
  { key: 'ints', label: 'INTs', valueKey: 'ints' },
];

export function StatsClient({
  leaders,
  teamRankings,
  playerCount,
}: {
  leaders: Record<string, Leader[]>;
  teamRankings: Record<string, TeamRank[]>;
  playerCount: number;
}) {
  const [mode, setMode] = useState<'player' | 'team'>('player');
  const [playerTab, setPlayerTab] = useState('passingYards');
  const [teamTab, setTeamTab] = useState('totalOffense');

  const playerRows = useMemo(() => leaders[playerTab] || [], [leaders, playerTab]);
  const teamMeta = TEAM_TABS.find((t) => t.key === teamTab) || TEAM_TABS[0];
  const teamRows = useMemo(() => teamRankings[teamTab] || [], [teamRankings, teamTab]);

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Leaders</p>
          <h2>Stats</h2>
          <p>{formatNumber(playerCount)} players with season stats in this extract.</p>
        </div>
      </div>

      <div className="tabs">
        <button type="button" className="tab" data-active={mode === 'player'} onClick={() => setMode('player')}>
          Player Leaders
        </button>
        <button type="button" className="tab" data-active={mode === 'team'} onClick={() => setMode('team')}>
          Team Rankings
        </button>
      </div>

      {mode === 'player' ? (
        <>
          <div className="tabs">
            {PLAYER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className="tab"
                data-active={playerTab === tab.key}
                onClick={() => setPlayerTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="panel tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {playerRows.map((row) => (
                  <tr key={`${row.rank}-${row.firstName}-${row.lastName}`}>
                    <td>{row.rank}</td>
                    <td>
                      {row.firstName} {row.lastName}
                    </td>
                    <td>{row.position}</td>
                    <td>{row.teamDisplayName}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="tabs">
            {TEAM_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className="tab"
                data-active={teamTab === tab.key}
                onClick={() => setTeamTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="panel tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>{teamMeta.key === 'totalDefense' ? 'Yds Allowed' : teamMeta.label}</th>
                  {teamMeta.key === 'totalDefense' && <th>Yds/G</th>}
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row, idx) => (
                  <tr key={`${row.displayName}-${idx}`}>
                    <td>{idx + 1}</td>
                    <td>{row.displayName}</td>
                    <td>{String(row[teamMeta.valueKey] ?? 0)}</td>
                    {teamMeta.key === 'totalDefense' && <td>{row.yardsPerGame ?? '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
