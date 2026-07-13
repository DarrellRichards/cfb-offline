'use client';

import { useMemo, useState } from 'react';
import type { ScheduleSnapshot } from '@/lib/types';
import { formatGameStatus } from '@/lib/schedule';
import { humanizeLabel } from '@/lib/format';

export function ScheduleClient({
  schedule,
  conferences,
  teamConferenceByIndex,
}: {
  schedule: ScheduleSnapshot;
  conferences: string[];
  teamConferenceByIndex: Record<number, string>;
}) {
  const [week, setWeek] = useState(schedule.currentWeek);
  const [conference, setConference] = useState('');
  const [query, setQuery] = useState('');

  const games = useMemo(() => {
    return schedule.games.filter((g) => {
      if (g.seasonWeek !== week) return false;
      if (conference) {
        const homeConf = g.home ? teamConferenceByIndex[g.home.teamIndex] : '';
        const awayConf = g.away ? teamConferenceByIndex[g.away.teamIndex] : '';
        if (homeConf !== conference && awayConf !== conference) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        const hay = `${g.home?.displayName || ''} ${g.away?.displayName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [schedule.games, week, conference, query, teamConferenceByIndex]);

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Slate</p>
          <h2>Schedule / Scores</h2>
          <p>
            Dynasty week {schedule.currentWeek} · {schedule.gameCount} games extracted
          </p>
        </div>
      </div>

      <div className="filters">
        <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {schedule.weeks.map((w) => (
            <option key={w} value={w}>
              Week {w}
              {w === schedule.currentWeek ? ' (current)' : ''}
            </option>
          ))}
        </select>
        <select value={conference} onChange={(e) => setConference(e.target.value)}>
          <option value="">All conferences</option>
          {conferences.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams…"
        />
      </div>

      <div className="panel tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Day</th>
              <th>Away</th>
              <th>Home</th>
              <th>Score</th>
              <th>Status</th>
              <th>Weather</th>
              <th>Network</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.row}>
                <td>
                  {g.dayOfWeek}
                  {g.gameDateMonth ? ` ${g.gameDateMonth}/${g.gameDateDay}` : ''}
                </td>
                <td>{g.away?.displayName || '—'}</td>
                <td>{g.home?.displayName || '—'}</td>
                <td>
                  {g.isFinal || g.awayScore || g.homeScore
                    ? `${g.awayScore}-${g.homeScore}`
                    : '—'}
                </td>
                <td>{formatGameStatus(g)}</td>
                <td>
                  {g.weather
                    ? `${humanizeLabel(g.weather)}${g.temperature ? ` · ${g.temperature}°` : ''}`
                    : '—'}
                </td>
                <td>{g.broadcastNetwork || '—'}</td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr>
                <td colSpan={7}>No games for this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
