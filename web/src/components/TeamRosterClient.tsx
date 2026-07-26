'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RosterPlayer, RosterPlayerSeasonStats } from '@/lib/types';

function humanize(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatHeight(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  if (value > 40) {
    const feet = Math.floor(value / 12);
    const inches = Math.trunc(value % 12);
    return `${feet}'${inches}"`;
  }
  return String(value);
}

function seasonLabel(season: RosterPlayerSeasonStats, currentSeasonYear?: number | null) {
  if (season.isCurrent) {
    return currentSeasonYear || season.seasonYear > 0 ? `${season.seasonYear || currentSeasonYear} (current)` : 'Current';
  }
  if (season.seasonYear > 0) return String(season.seasonYear);
  return 'Season';
}

function hasOffenseProduction(off: RosterPlayerSeasonStats['offense']) {
  if (!off) return false;
  return Boolean(
    off.passAttempts ||
      off.passYards ||
      off.rushAttempts ||
      off.rushYards ||
      off.receiveCatches ||
      off.receiveYards
  );
}

function hasDefenseProduction(def: RosterPlayerSeasonStats['defense']) {
  if (!def) return false;
  return Boolean(def.tackles || def.sacks || def.ints || def.tfl || def.deflections || def.forcedFumbles);
}

function hasKickingProduction(kick: RosterPlayerSeasonStats['kicking']) {
  if (!kick) return false;
  return Boolean(kick.fgAttempts || kick.xpAttempts || kick.puntAttempts || kick.fgMade || kick.xpMade);
}

type SortKey =
  | 'jersey'
  | 'firstName'
  | 'lastName'
  | 'position'
  | 'schoolYear'
  | 'overall'
  | 'devTrait';

export function TeamRosterClient({
  players,
  currentSeasonYear = null,
}: {
  players: RosterPlayer[];
  currentSeasonYear?: number | null;
}) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [year, setYear] = useState('');
  const [dev, setDev] = useState('');
  const [minOvr, setMinOvr] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<RosterPlayer | null>(null);
  const [seasonKey, setSeasonKey] = useState('');

  const positions = useMemo(
    () => [...new Set(players.map((p) => p.position).filter(Boolean))].sort(),
    [players]
  );
  const years = useMemo(
    () => [...new Set(players.map((p) => p.schoolYear).filter(Boolean))].sort(),
    [players]
  );
  const devs = useMemo(
    () => [...new Set(players.map((p) => p.devTrait).filter(Boolean))].sort(),
    [players]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = Number(minOvr);
    const filtered = players.filter((p) => {
      if (position && p.position !== position) return false;
      if (year && p.schoolYear !== year) return false;
      if (dev && p.devTrait !== dev) return false;
      if (Number.isFinite(min) && min > 0 && (p.overall ?? 0) < min) return false;
      if (!q) return true;
      const hay = [
        p.firstName,
        p.lastName,
        p.position,
        p.schoolYear,
        p.devTrait,
        p.archetypeLabel,
        p.playerType,
        p.jersey,
      ]
        .filter((v) => v != null && String(v).trim() !== '')
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' || typeof bv === 'number') {
        return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
      }
      return String(av || '').localeCompare(String(bv || '')) * dir;
    });
  }, [players, search, position, year, dev, minOvr, sortKey, sortDir]);

  const selectedSeasons = selected?.seasons || [];
  const activeSeason = useMemo(() => {
    if (!selectedSeasons.length) return null;
    return (
      selectedSeasons.find((s) => String(s.rawSeasonYear ?? s.seasonYear) === seasonKey) ||
      selectedSeasons.find((s) => s.isCurrent) ||
      selectedSeasons[0]
    );
  }, [selectedSeasons, seasonKey]);

  useEffect(() => {
    if (!selected) {
      setSeasonKey('');
      return;
    }
    const seasons = selected.seasons || [];
    const current = seasons.find((s) => s.isCurrent) || seasons[0];
    setSeasonKey(current ? String(current.rawSeasonYear ?? current.seasonYear) : '');
  }, [selected]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'overall' || key === 'jersey' ? 'desc' : 'asc');
  }

  const columns: Array<[SortKey, string]> = [
    ['jersey', '#'],
    ['firstName', 'First'],
    ['lastName', 'Last'],
    ['position', 'Pos'],
    ['schoolYear', 'Year'],
    ['overall', 'OVR'],
    ['devTrait', 'Dev'],
  ];

  const ratingEntries = selected
    ? Object.entries(selected.ratings || {})
        .filter(([key]) => key !== 'OverallRating')
        .sort((a, b) => a[0].localeCompare(b[0]))
    : [];

  return (
    <section className="section">
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Depth chart desk</p>
          <h2>Roster</h2>
          <p>
            {players.length
              ? `${players.length} players on this program — filter, sort, and open a card for ratings and season stats.`
              : 'No roster extract yet. Re-extract the dynasty to load players.'}
          </p>
        </div>
      </div>

      <div className="filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, pos, year…"
          style={{ minWidth: 220 }}
        />
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {humanize(y)}
            </option>
          ))}
        </select>
        <select value={dev} onChange={(e) => setDev(e.target.value)}>
          <option value="">All dev traits</option>
          {devs.map((d) => (
            <option key={d} value={d}>
              {humanize(d)}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={minOvr}
          onChange={(e) => setMinOvr(e.target.value)}
          placeholder="Min OVR"
          style={{ minWidth: 100 }}
        />
      </div>

      <div className="panel tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              {columns.map(([key, label]) => (
                <th key={key} style={{ cursor: 'pointer' }} onClick={() => toggleSort(key)}>
                  {label}
                  {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr
                key={`${p.playerRow}-${p.firstName}-${p.lastName}`}
                onClick={() => setSelected(p)}
                style={{ cursor: 'pointer' }}
              >
                <td>{p.jersey ?? '—'}</td>
                <td>{p.firstName}</td>
                <td>{p.lastName}</td>
                <td>{p.position || '—'}</td>
                <td>{humanize(p.schoolYear) || '—'}</td>
                <td>{p.overall ?? '—'}</td>
                <td>{humanize(p.devTrait) || '—'}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7}>{players.length ? 'No players match these filters.' : 'Roster not extracted yet.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <>
          <div className="drawerBackdrop" onClick={() => setSelected(null)} />
          <aside className="drawer" aria-label="Player details">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                  {selected.firstName} {selected.lastName}
                </h2>
                <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>
                  {selected.jersey != null ? `#${selected.jersey} · ` : ''}
                  {selected.position || '—'} · OVR {selected.overall ?? '—'}
                </p>
              </div>
              <button type="button" className="buttonGhost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className="detailGrid" style={{ marginTop: 16 }}>
              <div className="statTile">
                <span>Year</span>
                <strong style={{ fontSize: '1.1rem' }}>{humanize(selected.schoolYear) || '—'}</strong>
              </div>
              <div className="statTile">
                <span>Dev</span>
                <strong style={{ fontSize: '1.1rem' }}>{humanize(selected.devTrait) || '—'}</strong>
              </div>
              <div className="statTile">
                <span>Height</span>
                <strong style={{ fontSize: '1.1rem' }}>{formatHeight(selected.height)}</strong>
              </div>
              <div className="statTile">
                <span>Weight</span>
                <strong style={{ fontSize: '1.1rem' }}>
                  {selected.weight != null ? `${selected.weight}` : '—'}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Player</h3>
              <p>Archetype: {selected.archetypeLabel || humanize(selected.playerType) || '—'}</p>
              <p>Redshirt: {humanize(selected.redshirtStatus) || '—'}</p>
              <p>
                Years played:{' '}
                {selected.yearsPlayed != null && Number.isFinite(selected.yearsPlayed)
                  ? selected.yearsPlayed
                  : '—'}
              </p>
              <div style={{ marginTop: 10 }}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Physical abilities</strong>
                {(selected.physicalAbilityEntries || []).length > 0 ? (
                  <div className="abilityChips">
                    {(selected.physicalAbilityEntries || []).map((ability) => (
                      <span
                        key={`${ability.slot}-${ability.name}-${ability.tier}`}
                        className="abilityChip"
                        data-tier={String(ability.tier || '').toLowerCase()}
                        title={ability.label}
                      >
                        <span className="abilityChipName">{ability.name || `Slot ${ability.slot}`}</span>
                        <span className="abilityChipTier">{ability.tier}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: 'var(--muted)' }}>
                    {selected.physicalAbilities || 'None unlocked'}
                  </p>
                )}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div className="sectionHead" style={{ marginBottom: 10 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Season stats</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
                    Current season and prior years from the dynasty save.
                  </p>
                </div>
              </div>

              {selectedSeasons.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  No season stats on this extract yet. Re-extract Roster to load them.
                </p>
              ) : (
                <>
                  <label className="newsFilter" style={{ marginBottom: 12 }}>
                    <span>Season</span>
                    <select
                      value={seasonKey}
                      onChange={(e) => setSeasonKey(e.target.value)}
                      style={{ minWidth: 160 }}
                    >
                      {selectedSeasons.map((season) => {
                        const key = String(season.rawSeasonYear ?? season.seasonYear);
                        return (
                          <option key={key} value={key}>
                            {seasonLabel(season, currentSeasonYear)}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {activeSeason && (
                    <>
                      <div className="detailGrid" style={{ marginBottom: 12 }}>
                        <div className="statTile">
                          <span>Games</span>
                          <strong>{activeSeason.gamesPlayed || 0}</strong>
                        </div>
                        <div className="statTile">
                          <span>Season</span>
                          <strong style={{ fontSize: '1.1rem' }}>
                            {seasonLabel(activeSeason, currentSeasonYear)}
                          </strong>
                        </div>
                      </div>

                      {hasOffenseProduction(activeSeason.offense) && activeSeason.offense && (
                        <div style={{ marginBottom: 14 }}>
                          <strong style={{ display: 'block', marginBottom: 8 }}>Offense</strong>
                          <div className="detailGrid">
                            {(activeSeason.offense.passAttempts || activeSeason.offense.passYards) ? (
                              <>
                                <div className="statTile">
                                  <span>Pass</span>
                                  <strong style={{ fontSize: '1.05rem' }}>
                                    {activeSeason.offense.passCompletions || 0}/
                                    {activeSeason.offense.passAttempts || 0}
                                  </strong>
                                </div>
                                <div className="statTile">
                                  <span>Pass Yds</span>
                                  <strong>{activeSeason.offense.passYards || 0}</strong>
                                </div>
                                <div className="statTile">
                                  <span>Pass TD</span>
                                  <strong>{activeSeason.offense.passTds || 0}</strong>
                                </div>
                                <div className="statTile">
                                  <span>INT</span>
                                  <strong>{activeSeason.offense.passInts || 0}</strong>
                                </div>
                              </>
                            ) : null}
                            {(activeSeason.offense.rushAttempts || activeSeason.offense.rushYards) ? (
                              <>
                                <div className="statTile">
                                  <span>Rush</span>
                                  <strong>{activeSeason.offense.rushAttempts || 0}</strong>
                                </div>
                                <div className="statTile">
                                  <span>Rush Yds</span>
                                  <strong>{activeSeason.offense.rushYards || 0}</strong>
                                </div>
                                <div className="statTile">
                                  <span>Rush TD</span>
                                  <strong>{activeSeason.offense.rushTds || 0}</strong>
                                </div>
                              </>
                            ) : null}
                            {(activeSeason.offense.receiveCatches || activeSeason.offense.receiveYards) ? (
                              <>
                                <div className="statTile">
                                  <span>Rec</span>
                                  <strong>{activeSeason.offense.receiveCatches || 0}</strong>
                                </div>
                                <div className="statTile">
                                  <span>Rec Yds</span>
                                  <strong>{activeSeason.offense.receiveYards || 0}</strong>
                                </div>
                                <div className="statTile">
                                  <span>Rec TD</span>
                                  <strong>{activeSeason.offense.receiveTds || 0}</strong>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      )}

                      {hasDefenseProduction(activeSeason.defense) && activeSeason.defense && (
                        <div style={{ marginBottom: 14 }}>
                          <strong style={{ display: 'block', marginBottom: 8 }}>Defense</strong>
                          <div className="detailGrid">
                            <div className="statTile">
                              <span>Tackles</span>
                              <strong>{activeSeason.defense.tackles || 0}</strong>
                            </div>
                            <div className="statTile">
                              <span>TFL</span>
                              <strong>{activeSeason.defense.tfl || 0}</strong>
                            </div>
                            <div className="statTile">
                              <span>Sacks</span>
                              <strong>{activeSeason.defense.sacks || 0}</strong>
                            </div>
                            <div className="statTile">
                              <span>INT</span>
                              <strong>{activeSeason.defense.ints || 0}</strong>
                            </div>
                            <div className="statTile">
                              <span>PBU</span>
                              <strong>{activeSeason.defense.deflections || 0}</strong>
                            </div>
                            <div className="statTile">
                              <span>FF</span>
                              <strong>{activeSeason.defense.forcedFumbles || 0}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {hasKickingProduction(activeSeason.kicking) && activeSeason.kicking && (
                        <div style={{ marginBottom: 14 }}>
                          <strong style={{ display: 'block', marginBottom: 8 }}>Kicking / Punting</strong>
                          <div className="detailGrid">
                            <div className="statTile">
                              <span>FG</span>
                              <strong style={{ fontSize: '1.05rem' }}>
                                {activeSeason.kicking.fgMade || 0}/{activeSeason.kicking.fgAttempts || 0}
                              </strong>
                            </div>
                            <div className="statTile">
                              <span>Long</span>
                              <strong>{activeSeason.kicking.fgLong || 0}</strong>
                            </div>
                            <div className="statTile">
                              <span>XP</span>
                              <strong style={{ fontSize: '1.05rem' }}>
                                {activeSeason.kicking.xpMade || 0}/{activeSeason.kicking.xpAttempts || 0}
                              </strong>
                            </div>
                            <div className="statTile">
                              <span>Punt Yds</span>
                              <strong>{activeSeason.kicking.puntYards || 0}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {!hasOffenseProduction(activeSeason.offense) &&
                        !hasDefenseProduction(activeSeason.defense) &&
                        !hasKickingProduction(activeSeason.kicking) && (
                          <p style={{ margin: 0, color: 'var(--muted)' }}>
                            No recorded production for this season yet.
                          </p>
                        )}
                    </>
                  )}
                </>
              )}
            </div>

            {ratingEntries.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <h3>Ratings</h3>
                <div className="detailGrid">
                  {ratingEntries.map(([key, value]) => (
                    <div key={key} className="statTile">
                      <span>{humanize(key.replace(/Rating$/i, ''))}</span>
                      <strong style={{ fontSize: '1.2rem' }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </section>
  );
}
