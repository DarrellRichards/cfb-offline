'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { TeamRecord } from '@/lib/types';
import { formatRecord } from '@/lib/types';

function isFcsShell(team: TeamRecord) {
  return /^FCS\b/i.test(team.displayName || '') || /^FCS\b/i.test(team.label || '');
}

function standingKey(value: number) {
  return value > 0 ? value : 9999;
}

function compareStandings(a: TeamRecord, b: TeamRecord, mode: 'league' | 'conference') {
  const aStanding = mode === 'conference' ? a.standings.conference : a.standings.league;
  const bStanding = mode === 'conference' ? b.standings.conference : b.standings.league;
  const byStanding = standingKey(aStanding) - standingKey(bStanding);
  if (byStanding !== 0) return byStanding;

  if (mode === 'conference') {
    const aConfPct =
      a.record.confWins + a.record.confLosses > 0
        ? a.record.confWins / (a.record.confWins + a.record.confLosses + (a.record.confTies || 0))
        : -1;
    const bConfPct =
      b.record.confWins + b.record.confLosses > 0
        ? b.record.confWins / (b.record.confWins + b.record.confLosses + (b.record.confTies || 0))
        : -1;
    if (aConfPct !== bConfPct) return bConfPct - aConfPct;
  }

  const aPct = a.record.winPct || 0;
  const bPct = b.record.winPct || 0;
  if (aPct !== bPct) return bPct - aPct;
  return (a.label || a.displayName).localeCompare(b.label || b.displayName);
}

export function TeamsClient({ teams, conferences }: { teams: TeamRecord[]; conferences: string[] }) {
  const [conference, setConference] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'directory' | 'standings'>('standings');

  const fbsTeams = useMemo(() => teams.filter((t) => !isFcsShell(t)), [teams]);

  const conferenceOptions = useMemo(() => {
    const fromData = conferences.filter(Boolean);
    if (fromData.length) return fromData;
    return [...new Set(fbsTeams.map((t) => t.conference?.name).filter(Boolean) as string[])].sort();
  }, [conferences, fbsTeams]);

  const filtered = useMemo(() => {
    const rows = fbsTeams.filter((t) => {
      if (conference && t.conference?.name !== conference) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!`${t.displayName} ${t.nickname} ${t.label}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return [...rows].sort((a, b) =>
      compareStandings(a, b, conference ? 'conference' : 'league')
    );
  }, [fbsTeams, conference, query]);

  const standingsByConference = useMemo(() => {
    const groups = new Map<string, TeamRecord[]>();
    for (const team of fbsTeams) {
      if (conference && team.conference?.name !== conference) continue;
      if (query) {
        const q = query.toLowerCase();
        if (!`${team.displayName} ${team.nickname} ${team.label}`.toLowerCase().includes(q)) {
          continue;
        }
      }
      const name = team.conference?.name || 'Independent';
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(team);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, rows]) => ({
        name,
        teams: [...rows].sort((a, b) => compareStandings(a, b, 'conference')),
      }));
  }, [fbsTeams, conference, query]);

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Directory</p>
          <h2>Teams</h2>
          <p>
            {fbsTeams.length} FBS programs
            {teams.length !== fbsTeams.length ? ` · FCS shells hidden` : ''}
          </p>
        </div>
      </div>

      <div className="filters">
        <select value={view} onChange={(e) => setView(e.target.value as 'directory' | 'standings')}>
          <option value="standings">Conference standings</option>
          <option value="directory">Team directory</option>
        </select>
        <select value={conference} onChange={(e) => setConference(e.target.value)}>
          <option value="">All conferences</option>
          {conferenceOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams…" />
      </div>

      {view === 'standings' ? (
        <div className="standingsStack">
          {standingsByConference.map((group) => (
            <div key={group.name} className="panel tableWrap" style={{ marginBottom: 16 }}>
              <div className="standingsGroupHead">
                <h3>{group.name}</h3>
                <span>{group.teams.length} teams</span>
              </div>
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Conf</th>
                    <th>Overall</th>
                    <th>OVR</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((t, idx) => (
                    <tr key={t.teamIndex}>
                      <td>{t.standings.conference > 0 ? t.standings.conference : idx + 1}</td>
                      <td>
                        <Link href={`/teams/${t.teamIndex}`}>{t.label || t.displayName}</Link>
                      </td>
                      <td>
                        {formatRecord(t.record.confWins, t.record.confLosses, t.record.confTies || 0)}
                      </td>
                      <td>{formatRecord(t.record.wins, t.record.losses, t.record.ties)}</td>
                      <td>{t.ratings.overall || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {standingsByConference.length === 0 && (
            <div className="panel emptyState">No conference standings for this filter.</div>
          )}
        </div>
      ) : (
        <div className="panel tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>Conf</th>
                <th>Record</th>
                <th>Conf Rec</th>
                <th>OVR</th>
                <th>Media</th>
                <th>Off</th>
                <th>Def</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => (
                <tr key={t.teamIndex}>
                  <td>
                    {conference
                      ? t.standings.conference > 0
                        ? t.standings.conference
                        : idx + 1
                      : t.standings.league > 0
                        ? t.standings.league
                        : idx + 1}
                  </td>
                  <td>
                    <Link href={`/teams/${t.teamIndex}`}>{t.label || t.displayName}</Link>
                  </td>
                  <td>{t.conference?.name || '—'}</td>
                  <td>{formatRecord(t.record.wins, t.record.losses, t.record.ties)}</td>
                  <td>
                    {formatRecord(t.record.confWins, t.record.confLosses, t.record.confTies || 0)}
                  </td>
                  <td>{t.ratings.overall || '—'}</td>
                  <td>
                    {t.polls.media.rank > 0 && t.polls.media.rank <= 25 ? t.polls.media.rank : '—'}
                  </td>
                  <td>{t.ratings.offense || '—'}</td>
                  <td>{t.ratings.defense || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="emptyState">No teams for this filter.</div>}
        </div>
      )}
    </section>
  );
}
