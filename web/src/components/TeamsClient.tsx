'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { TeamRecord } from '@/lib/types';
import { formatRecord } from '@/lib/types';

function isFcsShell(team: TeamRecord) {
  return /^FCS\b/i.test(team.displayName || '') || /^FCS\b/i.test(team.label || '');
}

/** Game stores CurSeasonConfStanding as 0-based (0 = 1st). */
function conferenceRank(team: TeamRecord) {
  const raw = Number(team.standings?.conference);
  if (!Number.isFinite(raw) || raw < 0) return null;
  return raw + 1;
}

function compareConferenceStandings(a: TeamRecord, b: TeamRecord) {
  const aRaw = Number(a.standings?.conference);
  const bRaw = Number(b.standings?.conference);
  const aHas = Number.isFinite(aRaw) && aRaw >= 0;
  const bHas = Number.isFinite(bRaw) && bRaw >= 0;
  if (aHas && bHas && aRaw !== bRaw) return aRaw - bRaw;
  if (aHas !== bHas) return aHas ? -1 : 1;

  const aConfGames = a.record.confWins + a.record.confLosses + (a.record.confTies || 0);
  const bConfGames = b.record.confWins + b.record.confLosses + (b.record.confTies || 0);
  const aConfPct = aConfGames > 0 ? a.record.confWins / aConfGames : -1;
  const bConfPct = bConfGames > 0 ? b.record.confWins / bConfGames : -1;
  if (aConfPct !== bConfPct) return bConfPct - aConfPct;
  if (a.record.confWins !== b.record.confWins) return b.record.confWins - a.record.confWins;

  const aPct = a.record.winPct || 0;
  const bPct = b.record.winPct || 0;
  if (aPct !== bPct) return bPct - aPct;
  return (a.label || a.displayName).localeCompare(b.label || b.displayName);
}

function compareLeagueStandings(a: TeamRecord, b: TeamRecord) {
  const aStanding = Number(a.standings?.league) || 0;
  const bStanding = Number(b.standings?.league) || 0;
  const aKey = aStanding > 0 ? aStanding : 9999;
  const bKey = bStanding > 0 ? bStanding : 9999;
  if (aKey !== bKey) return aKey - bKey;
  const aPct = a.record.winPct || 0;
  const bPct = b.record.winPct || 0;
  if (aPct !== bPct) return bPct - aPct;
  return (a.label || a.displayName).localeCompare(b.label || b.displayName);
}

function teamLabel(team: TeamRecord) {
  return team.label || team.displayName;
}

export function TeamsClient({ teams, conferences }: { teams: TeamRecord[]; conferences: string[] }) {
  const [conference, setConference] = useState('');
  const [teamIndex, setTeamIndex] = useState('');
  const [view, setView] = useState<'directory' | 'standings'>('standings');

  const fbsTeams = useMemo(() => teams.filter((t) => !isFcsShell(t)), [teams]);

  const conferenceOptions = useMemo(() => {
    const fromData = conferences.filter(Boolean);
    if (fromData.length) return fromData;
    return [...new Set(fbsTeams.map((t) => t.conference?.name).filter(Boolean) as string[])].sort();
  }, [conferences, fbsTeams]);

  const teamOptions = useMemo(() => {
    const rows = fbsTeams.filter((t) => {
      if (conference && t.conference?.name !== conference) return false;
      return true;
    });
    return [...rows].sort((a, b) => teamLabel(a).localeCompare(teamLabel(b)));
  }, [fbsTeams, conference]);

  // Keep team selection valid when conference changes.
  const selectedTeamIndex = useMemo(() => {
    if (!teamIndex) return '';
    const idx = Number(teamIndex);
    if (!teamOptions.some((t) => t.teamIndex === idx)) return '';
    return teamIndex;
  }, [teamIndex, teamOptions]);

  const filtered = useMemo(() => {
    const rows = fbsTeams.filter((t) => {
      if (conference && t.conference?.name !== conference) return false;
      if (selectedTeamIndex && String(t.teamIndex) !== selectedTeamIndex) return false;
      return true;
    });
    return [...rows].sort((a, b) =>
      conference || selectedTeamIndex ? compareConferenceStandings(a, b) : compareLeagueStandings(a, b)
    );
  }, [fbsTeams, conference, selectedTeamIndex]);

  const standingsByConference = useMemo(() => {
    const groups = new Map<string, TeamRecord[]>();
    for (const team of fbsTeams) {
      if (conference && team.conference?.name !== conference) continue;
      if (selectedTeamIndex && String(team.teamIndex) !== selectedTeamIndex) continue;
      const name = team.conference?.name || 'Independent';
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(team);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, rows]) => ({
        name,
        teams: [...rows].sort(compareConferenceStandings),
      }));
  }, [fbsTeams, conference, selectedTeamIndex]);

  function onConferenceChange(value: string) {
    setConference(value);
    setTeamIndex('');
  }

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
        <select value={conference} onChange={(e) => onConferenceChange(e.target.value)}>
          <option value="">All conferences</option>
          {conferenceOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={selectedTeamIndex}
          onChange={(e) => setTeamIndex(e.target.value)}
          aria-label="Filter by team"
        >
          <option value="">All teams</option>
          {teamOptions.map((t) => (
            <option key={t.teamIndex} value={String(t.teamIndex)}>
              {teamLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {view === 'standings' ? (
        <div className="standingsStack">
          {standingsByConference.map((group) => (
            <div key={group.name} className="panel tableWrap" style={{ marginBottom: 16 }}>
              <div className="standingsGroupHead">
                <h3>{group.name}</h3>
                <span>
                  {group.teams.length} team{group.teams.length === 1 ? '' : 's'}
                </span>
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
                  {group.teams.map((t) => {
                    const rank = conferenceRank(t);
                    return (
                      <tr key={t.teamIndex}>
                        <td>{rank ?? '—'}</td>
                        <td>
                          <Link href={`/teams/${t.teamIndex}`}>{teamLabel(t)}</Link>
                        </td>
                        <td>
                          {formatRecord(t.record.confWins, t.record.confLosses, t.record.confTies || 0)}
                        </td>
                        <td>{formatRecord(t.record.wins, t.record.losses, t.record.ties)}</td>
                        <td>{t.ratings.overall || '—'}</td>
                      </tr>
                    );
                  })}
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
                    {conference || selectedTeamIndex
                      ? conferenceRank(t) ?? idx + 1
                      : t.standings.league > 0
                        ? t.standings.league
                        : idx + 1}
                  </td>
                  <td>
                    <Link href={`/teams/${t.teamIndex}`}>{teamLabel(t)}</Link>
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
