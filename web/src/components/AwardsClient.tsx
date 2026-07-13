'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatRecord, type AwardsSnapshot } from '@/lib/types';

type Tab = 'current' | 'champions' | 'season';

function playerLabel(row: { firstName?: string; lastName?: string }) {
  return `${row.firstName || ''} ${row.lastName || ''}`.trim() || '—';
}

function coachLabel(first?: string, last?: string) {
  const name = `${first || ''} ${last || ''}`.trim();
  return name || null;
}

export function AwardsClient({ awards }: { awards: AwardsSnapshot }) {
  const [tab, setTab] = useState<Tab>('current');
  const historyYears = useMemo(() => {
    const years = new Set<number>(awards.seasonYears || []);
    for (const row of awards.nationalChampions || []) years.add(row.seasonYear);
    for (const row of awards.conferenceChampions || []) years.add(row.seasonYear);
    for (const row of awards.annualAwards || []) years.add(row.seasonYear);
    return [...years].filter((y) => Number.isFinite(y) && y > 0).sort((a, b) => b - a);
  }, [awards]);
  const [seasonYear, setSeasonYear] = useState<number>(
    historyYears[0] || awards.seasonYear || 0
  );

  const weeklyByWeek = useMemo(() => {
    const map = new Map<number, typeof awards.current.weeklyAwards>();
    for (const row of awards.current?.weeklyAwards || []) {
      const week = Number(row.periodIndex) || 0;
      if (!map.has(week)) map.set(week, []);
      map.get(week)!.push(row);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [awards]);

  const seasonAnnual = useMemo(
    () => (awards.annualAwards || []).filter((row) => row.seasonYear === seasonYear),
    [awards.annualAwards, seasonYear]
  );
  const seasonConf = useMemo(
    () => (awards.conferenceChampions || []).filter((row) => row.seasonYear === seasonYear),
    [awards.conferenceChampions, seasonYear]
  );
  const seasonNc = useMemo(
    () => (awards.nationalChampions || []).find((row) => row.seasonYear === seasonYear) || null,
    [awards.nationalChampions, seasonYear]
  );

  const preseasonNational = useMemo(
    () =>
      (awards.current?.preseasonAllAmericans || []).filter(
        (row) => row.awardType && !/_CONF$/i.test(row.awardType)
      ),
    [awards]
  );

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Hardware & history</p>
          <h2>Awards</h2>
          <p>
            {awards.seasonYear
              ? `${awards.seasonYear} season — Heisman race, weekly awards, and year-end champions.`
              : 'Heisman race, weekly awards, and year-end champions.'}
          </p>
        </div>
      </div>

      <div className="tabs">
        <button type="button" className="tab" data-active={tab === 'current'} onClick={() => setTab('current')}>
          Current
        </button>
        <button
          type="button"
          className="tab"
          data-active={tab === 'champions'}
          onClick={() => setTab('champions')}
        >
          National Champions
        </button>
        <button type="button" className="tab" data-active={tab === 'season'} onClick={() => setTab('season')}>
          Season Awards
        </button>
      </div>

      {tab === 'current' && (
        <>
          <div className="panel tableWrap" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 10px' }}>Heisman Race</h3>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>OVR</th>
                </tr>
              </thead>
              <tbody>
                {(awards.current?.heismanRace || []).map((row, idx) => (
                  <tr key={`heisman-${idx}-${row.lastName}`}>
                    <td>{row.rank ?? idx + 1}</td>
                    <td>{playerLabel(row)}</td>
                    <td>{row.position || '—'}</td>
                    <td>
                      {row.teamIndex != null ? (
                        <Link href={`/teams/${row.teamIndex}`}>{row.teamDisplayName || '—'}</Link>
                      ) : (
                        row.teamDisplayName || '—'
                      )}
                    </td>
                    <td>{row.overall || '—'}</td>
                  </tr>
                ))}
                {(awards.current?.heismanRace || []).length === 0 && (
                  <tr>
                    <td colSpan={5}>No Heisman rankings in this extract yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panel tableWrap" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 10px' }}>Weekly Awards</h3>
            {weeklyByWeek.length === 0 ? (
              <p className="emptyState" style={{ margin: 0 }}>
                No weekly award winners yet.
              </p>
            ) : (
              weeklyByWeek.map(([week, rows]) => (
                <div key={`week-${week}`} style={{ marginBottom: 18 }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    Week {week + 1}
                  </p>
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>Award</th>
                        <th>Player</th>
                        <th>Pos</th>
                        <th>Team</th>
                        <th>Conf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={`week-${week}-${idx}-${row.lastName}`}>
                          <td>{row.awardLabel || row.awardType}</td>
                          <td>{playerLabel(row)}</td>
                          <td>{row.position || '—'}</td>
                          <td>
                            {row.teamIndex != null ? (
                              <Link href={`/teams/${row.teamIndex}`}>{row.teamDisplayName || '—'}</Link>
                            ) : (
                              row.teamDisplayName || '—'
                            )}
                          </td>
                          <td>{row.conferenceName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>

          <details className="panel" style={{ padding: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              Preseason All-Americans ({preseasonNational.length})
            </summary>
            <div className="tableWrap" style={{ marginTop: 12 }}>
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Award</th>
                    <th>Player</th>
                    <th>Pos</th>
                    <th>Team</th>
                  </tr>
                </thead>
                <tbody>
                  {preseasonNational.slice(0, 120).map((row, idx) => (
                    <tr key={`pre-${idx}-${row.lastName}-${row.position}`}>
                      <td>{row.awardLabel || row.awardType}</td>
                      <td>{playerLabel(row)}</td>
                      <td>{row.position || '—'}</td>
                      <td>{row.teamDisplayName || '—'}</td>
                    </tr>
                  ))}
                  {preseasonNational.length === 0 && (
                    <tr>
                      <td colSpan={4}>No preseason All-Americans in this extract.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {tab === 'champions' && (
        <div className="panel tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Season</th>
                <th>Champion</th>
                <th>Record</th>
                <th>Score</th>
                <th>Runner-up</th>
                <th>Coach</th>
              </tr>
            </thead>
            <tbody>
              {(awards.nationalChampions || []).map((row) => {
                const coach = coachLabel(row.champion.coachFirstName, row.champion.coachLastName);
                return (
                  <tr key={`nc-${row.seasonYear}-${row.champion.displayName}`}>
                    <td>{row.seasonYear}</td>
                    <td>
                      {row.champion.teamIndex != null ? (
                        <Link href={`/teams/${row.champion.teamIndex}`}>{row.champion.displayName}</Link>
                      ) : (
                        row.champion.displayName
                      )}
                      {row.champion.rank > 0 ? ` (#${row.champion.rank})` : ''}
                    </td>
                    <td>{formatRecord(row.champion.wins, row.champion.losses)}</td>
                    <td>
                      {row.champion.score}-{row.runnerUp.score}
                    </td>
                    <td>
                      {row.runnerUp.teamIndex != null ? (
                        <Link href={`/teams/${row.runnerUp.teamIndex}`}>{row.runnerUp.displayName}</Link>
                      ) : (
                        row.runnerUp.displayName || '—'
                      )}
                    </td>
                    <td>{coach || '—'}</td>
                  </tr>
                );
              })}
              {(awards.nationalChampions || []).length === 0 && (
                <tr>
                  <td colSpan={6}>
                    No national champions archived yet. Finish a season and re-extract after the
                    title game to start the ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'season' && (
        <>
          {historyYears.length > 0 && (
            <div className="tabs" style={{ marginBottom: 12 }}>
              {historyYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  className="tab"
                  data-active={seasonYear === year}
                  onClick={() => setSeasonYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          <div className="panel" style={{ marginBottom: 16, padding: 16 }}>
            <h3 style={{ margin: '0 0 8px' }}>{seasonYear || 'Season'} National Champion</h3>
            {seasonNc ? (
              <p style={{ margin: 0 }}>
                <strong>
                  {seasonNc.champion.teamIndex != null ? (
                    <Link href={`/teams/${seasonNc.champion.teamIndex}`}>
                      {seasonNc.champion.displayName}
                    </Link>
                  ) : (
                    seasonNc.champion.displayName
                  )}
                </strong>
                {` def. ${seasonNc.runnerUp.displayName} ${seasonNc.champion.score}-${seasonNc.runnerUp.score}`}
                {coachLabel(seasonNc.champion.coachFirstName, seasonNc.champion.coachLastName)
                  ? ` · Coach ${coachLabel(seasonNc.champion.coachFirstName, seasonNc.champion.coachLastName)}`
                  : ''}
              </p>
            ) : (
              <p className="emptyState" style={{ margin: 0 }}>
                No national champion recorded for this season yet.
              </p>
            )}
          </div>

          <div className="panel tableWrap" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 10px' }}>Annual Awards</h3>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Award</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                {seasonAnnual.map((row, idx) => (
                  <tr key={`ann-${seasonYear}-${idx}-${row.awardType}`}>
                    <td>{row.awardLabel || row.awardType}</td>
                    <td>{playerLabel(row)}</td>
                    <td>{row.position || '—'}</td>
                    <td>
                      {row.teamIndex != null ? (
                        <Link href={`/teams/${row.teamIndex}`}>{row.teamDisplayName || '—'}</Link>
                      ) : (
                        row.teamDisplayName || '—'
                      )}
                    </td>
                  </tr>
                ))}
                {seasonAnnual.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      No annual awards for this season yet. They fill after awards night /
                      year-end history.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panel tableWrap">
            <h3 style={{ margin: '0 0 10px' }}>Conference Champions</h3>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Conference</th>
                  <th>Champion</th>
                  <th>Score</th>
                  <th>Runner-up</th>
                </tr>
              </thead>
              <tbody>
                {seasonConf.map((row) => (
                  <tr key={`cc-${seasonYear}-${row.conferenceName}`}>
                    <td>{row.conferenceName || '—'}</td>
                    <td>
                      {row.champion.teamIndex != null ? (
                        <Link href={`/teams/${row.champion.teamIndex}`}>{row.champion.displayName}</Link>
                      ) : (
                        row.champion.displayName
                      )}
                    </td>
                    <td>
                      {row.champion.score}-{row.runnerUp.score}
                    </td>
                    <td>{row.runnerUp.displayName || '—'}</td>
                  </tr>
                ))}
                {seasonConf.length === 0 && (
                  <tr>
                    <td colSpan={4}>No conference champions recorded for this season yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
