'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { TeamRecord } from '@/lib/types';
import { formatRecord } from '@/lib/types';

export function TeamsClient({ teams, conferences }: { teams: TeamRecord[]; conferences: string[] }) {
  const [conference, setConference] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return teams.filter((t) => {
      if (conference && t.conference?.name !== conference) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!`${t.displayName} ${t.nickname} ${t.label}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [teams, conference, query]);

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Directory</p>
          <h2>Teams</h2>
          <p>{teams.length} programs in the dynasty file.</p>
        </div>
      </div>

      <div className="filters">
        <select value={conference} onChange={(e) => setConference(e.target.value)}>
          <option value="">All conferences</option>
          {conferences.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams…" />
      </div>

      <div className="panel tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Team</th>
              <th>Conf</th>
              <th>Record</th>
              <th>OVR</th>
              <th>Media</th>
              <th>Off</th>
              <th>Def</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.teamIndex}>
                <td>
                  <Link href={`/teams/${t.teamIndex}`}>{t.label || t.displayName}</Link>
                </td>
                <td>{t.conference?.name || '—'}</td>
                <td>{formatRecord(t.record.wins, t.record.losses, t.record.ties)}</td>
                <td>{t.ratings.overall || '—'}</td>
                <td>{t.polls.media.rank > 0 && t.polls.media.rank <= 25 ? t.polls.media.rank : '—'}</td>
                <td>{t.ratings.offense || '—'}</td>
                <td>{t.ratings.defense || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
