'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientDate } from '@/lib/ClientDate';
import { formatNumber } from '@/lib/format';
import { buildAllAttributes, buildKeyAttributes, listKeyAttributeMeta } from '@/lib/recruit-attributes';
import { useExtract } from './ExtractProvider';
import { useSettings } from './SettingsProvider';

type Recruit = {
  firstName: string;
  lastName: string;
  position: string;
  playerType?: string;
  archetypeLabel?: string;
  nationalRank?: number;
  stars: number | string;
  overall: number | null;
  devTrait: string;
  dealbreaker: string;
  offerCount: number;
  recruitStage: string;
  dealbreakerSchoolGrade?: string;
  dealbreakerStatus?: string;
  dealbreakerStatusDetail?: string;
  recruitClass?: string;
  prospectSource?: 'highSchool' | 'transfer' | 'juco' | 'other' | string;
  classYear?: string;
  isTransfer?: boolean;
  isJuco?: boolean;
  transferFrom?: string;
  transferFromTeamIndex?: number | null;
  idealPitch?: string;
  activePitches?: string;
  swayPitch?: string;
  physicalAbilities?: string;
  physicalAbilityEntries?: Array<{
    slot: number;
    name: string;
    tier: string;
    label: string;
  }>;
  boardRow?: number;
  recruitRow?: number;
  onMyBoard?: boolean;
  ratings?: Record<string, number>;
  topSchools?: Array<{
    rank: number;
    teamLabel: string;
    influence: number;
    scholarshipStatus?: string;
  }>;
};

type TeamContext = {
  teamLabel?: string;
  coachName?: string;
  nilProgramPointsSpent?: number;
  remainingProgramPoints?: number;
  programPointBudget?: number;
  recruitProgramPointsSpent?: number;
  brandExposureProgramPoints?: number;
  conferencePrestigeProgramPoints?: number;
  programTraditionsProgramPoints?: number;
  stadiumAtmosphereProgramPoints?: number;
  grades?: Record<string, string>;
};

function humanize(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatGrade(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/plus$/i.test(raw)) return `${raw[0].toUpperCase()}+`;
  if (/minus$/i.test(raw)) return `${raw[0].toUpperCase()}-`;
  return raw;
}

function RecruitRatingsPanel({
  ratings,
  position,
  playerType,
}: {
  ratings: Record<string, number>;
  position: string;
  playerType?: string;
}) {
  const keyAttrs = useMemo(
    () => buildKeyAttributes(ratings, position, playerType),
    [ratings, position, playerType]
  );
  const allAttrs = useMemo(() => buildAllAttributes(ratings), [ratings]);

  return (
    <>
      <div style={{ marginTop: 18 }}>
        <h3>Key attributes</h3>
        <p style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Scout priorities for {humanize(playerType) || position || 'this position'}
        </p>
        <div className="detailGrid">
          {keyAttrs.map((attr) => (
            <div className="statTile" key={`key-${attr.key}`} title={attr.label}>
              <span>
                {attr.short}
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {attr.label}</span>
              </span>
              <strong style={{ fontSize: '1.2rem' }}>{attr.value}</strong>
            </div>
          ))}
          {keyAttrs.length === 0 && (
            <p style={{ margin: 0, color: 'var(--muted)' }}>No key attributes available.</p>
          )}
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <h3>All attributes ({allAttrs.length})</h3>
        <div className="detailGrid">
          {allAttrs.map((attr) => (
            <div className="statTile" key={`all-${attr.key}`} title={attr.label}>
              <span>
                {attr.short}
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {attr.label}</span>
              </span>
              <strong style={{ fontSize: '1.2rem' }}>{attr.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function RecruitingClient({
  recruits,
  teamContext,
  savePath,
  generatedAt,
}: {
  recruits: Recruit[];
  teamContext: TeamContext;
  savePath: string;
  generatedAt: string;
}) {
  const router = useRouter();
  const { settings, ready } = useSettings();
  const { canWriteBack } = useExtract();
  const showDevTraits = settings.recruitingDevTraits;
  const showOverall = settings.recruitingOverall;
  const allowNilUpdates = settings.nilUpdates && canWriteBack;

  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [stars, setStars] = useState('');
  const [stage, setStage] = useState('');
  const [dev, setDev] = useState('');
  const [minOvr, setMinOvr] = useState('');
  const [boardScope, setBoardScope] = useState<'all' | 'mine'>('all');
  const [prospectSource, setProspectSource] = useState<'all' | 'highSchool' | 'transfer' | 'juco'>(
    'all'
  );
  const [classYear, setClassYear] = useState('');
  const [sortKey, setSortKey] = useState<keyof Recruit | 'nationalRank'>('nationalRank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Recruit | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [ratingFilterOpen, setRatingFilterOpen] = useState(false);
  const [ratingMins, setRatingMins] = useState<Record<string, string>>({});

  const [nilValue, setNilValue] = useState(String(teamContext.nilProgramPointsSpent ?? ''));
  const [totalBudget, setTotalBudget] = useState(String(teamContext.programPointBudget ?? ''));
  const [recruitPts, setRecruitPts] = useState(String(teamContext.recruitProgramPointsSpent ?? ''));
  const [brandPts, setBrandPts] = useState(String(teamContext.brandExposureProgramPoints ?? ''));
  const [confPts, setConfPts] = useState(String(teamContext.conferencePrestigeProgramPoints ?? ''));
  const [tradPts, setTradPts] = useState(String(teamContext.programTraditionsProgramPoints ?? ''));
  const [stadPts, setStadPts] = useState(String(teamContext.stadiumAtmosphereProgramPoints ?? ''));

  useEffect(() => {
    if (!ready) return;
    if (!settings.recruiting) router.replace('/');
  }, [ready, settings.recruiting, router]);

  useEffect(() => {
    if (!showDevTraits) {
      setDev('');
      if (sortKey === 'devTrait') setSortKey('nationalRank');
    }
  }, [showDevTraits, sortKey]);

  useEffect(() => {
    if (!showOverall) {
      setMinOvr('');
      if (sortKey === 'overall') setSortKey('nationalRank');
    }
  }, [showOverall, sortKey]);

  useEffect(() => {
    setRatingMins({});
    setRatingFilterOpen(false);
  }, [position]);

  useEffect(() => {
    if (prospectSource === 'highSchool') setClassYear('');
  }, [prospectSource]);

  const showTransferColumns = prospectSource === 'transfer' || prospectSource === 'juco';

  const positionKeyAttrs = useMemo(
    () => (position ? listKeyAttributeMeta(position) : []),
    [position]
  );

  const activeRatingFilters = useMemo(() => {
    return positionKeyAttrs
      .map((attr) => {
        const raw = ratingMins[attr.key];
        const min = Number(raw);
        if (!raw || !Number.isFinite(min) || min <= 0) return null;
        return { ...attr, min };
      })
      .filter(Boolean) as Array<{ key: string; label: string; short: string; min: number }>;
  }, [positionKeyAttrs, ratingMins]);

  const positions = useMemo(
    () => [...new Set(recruits.map((r) => r.position).filter(Boolean))].sort(),
    [recruits]
  );
  const stages = useMemo(
    () => [...new Set(recruits.map((r) => r.recruitStage).filter(Boolean))].sort(),
    [recruits]
  );
  const devs = useMemo(
    () => [...new Set(recruits.map((r) => r.devTrait).filter(Boolean))].sort(),
    [recruits]
  );
  const classYears = useMemo(() => {
    const pool =
      prospectSource === 'transfer' || prospectSource === 'juco'
        ? recruits.filter((r) => r.prospectSource === prospectSource)
        : recruits.filter((r) => r.prospectSource === 'transfer' || r.prospectSource === 'juco');
    return [...new Set(pool.map((r) => r.classYear).filter(Boolean) as string[])].sort();
  }, [recruits, prospectSource]);

  const sourceCounts = useMemo(() => {
    let highSchool = 0;
    let transfer = 0;
    let juco = 0;
    for (const r of recruits) {
      if (r.prospectSource === 'transfer') transfer += 1;
      else if (r.prospectSource === 'juco') juco += 1;
      else highSchool += 1;
    }
    return { highSchool, transfer, juco };
  }, [recruits]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = Number(minOvr);
    let rows = recruits.filter((r) => {
      if (boardScope === 'mine' && !r.onMyBoard) return false;
      if (prospectSource !== 'all') {
        const source =
          r.prospectSource || (r.isTransfer ? 'transfer' : r.isJuco ? 'juco' : 'highSchool');
        if (source !== prospectSource) return false;
      }
      if (classYear && r.classYear !== classYear) return false;
      if (position && r.position !== position) return false;
      if (stars && String(r.stars) !== stars) return false;
      if (stage && r.recruitStage !== stage) return false;
      if (dev && r.devTrait !== dev) return false;
      if (showOverall && Number.isFinite(min) && min > 0 && !(Number(r.overall) >= min)) return false;
      if (activeRatingFilters.length) {
        const ratings = r.ratings || {};
        for (const filter of activeRatingFilters) {
          const value = Number(ratings[filter.key]);
          if (!Number.isFinite(value) || value < filter.min) return false;
        }
      }
      if (q) {
        const hay = [
          r.firstName,
          r.lastName,
          r.position,
          r.dealbreaker,
          r.idealPitch,
          r.physicalAbilities,
          r.devTrait,
          r.transferFrom,
          r.classYear,
          r.recruitClass,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      const av = a[sortKey as keyof Recruit];
      const bv = b[sortKey as keyof Recruit];
      const an = typeof av === 'number' ? av : Number(av);
      const bn = typeof bv === 'number' ? bv : Number(bv);
      let cmp = 0;
      if (Number.isFinite(an) && Number.isFinite(bn)) cmp = an - bn;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [
    recruits,
    search,
    position,
    stars,
    stage,
    dev,
    minOvr,
    sortKey,
    sortDir,
    showOverall,
    boardScope,
    prospectSource,
    classYear,
    activeRatingFilters,
  ]);

  function toggleSort(key: keyof Recruit | 'nationalRank') {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'nationalRank' || key === 'overall' || key === 'stars' ? 'asc' : 'asc');
    }
  }

  async function updateNil() {
    if (!savePath) {
      setStatus('No save path on this extract.');
      return;
    }
    setBusy(true);
    setStatus('Updating NIL points…');
    try {
      const res = await fetch('/api/team/nil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ savePath, nilValue: Number(nilValue) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'NIL update failed');
      setStatus(`NIL updated to ${json.newNilValue ?? nilValue}`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function updatePoints() {
    if (!savePath) {
      setStatus('No save path on this extract.');
      return;
    }
    setBusy(true);
    setStatus('Updating program points…');
    try {
      const res = await fetch('/api/team/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          savePath,
          totalBudgetValue: totalBudget === '' ? undefined : Number(totalBudget),
          recruitValue: recruitPts === '' ? undefined : Number(recruitPts),
          brandExposureValue: brandPts === '' ? undefined : Number(brandPts),
          conferencePrestigeValue: confPts === '' ? undefined : Number(confPts),
          programTraditionsValue: tradPts === '' ? undefined : Number(tradPts),
          stadiumAtmosphereValue: stadPts === '' ? undefined : Number(stadPts),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Points update failed');
      setStatus('Program points updated in save.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (ready && !settings.recruiting) {
    return null;
  }

  const grades = teamContext.grades || {};

  const tableColumns = (
    [
      ['nationalRank', 'Nat'],
      ['firstName', 'First'],
      ['lastName', 'Last'],
      ['position', 'Pos'],
      ['stars', 'Stars'],
      ...(showTransferColumns
        ? ([
            ['transferFrom', 'From'],
            ['classYear', 'Year'],
          ] as const)
        : []),
      ...(showOverall ? ([['overall', 'OVR']] as const) : []),
      ...(showDevTraits ? ([['devTrait', 'Dev']] as const) : []),
      ['offerCount', 'Offers'],
      ['recruitStage', 'Stage'],
      ['dealbreaker', 'Dealbreaker'],
    ] as Array<[keyof Recruit | 'nationalRank', string]>
  );

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h2>Recruiting</h2>
          <p>
            {teamContext.teamLabel || 'Your program'} · {formatNumber(visible.length)} visible /{' '}
            {formatNumber(recruits.length)} class
            {recruits.some((r) => r.onMyBoard)
              ? ` · ${formatNumber(recruits.filter((r) => r.onMyBoard).length)} on your board`
              : ''}
            {generatedAt ? (
              <>
                {' · '}
                <ClientDate value={generatedAt} />
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="detailGrid" style={{ marginBottom: 18 }}>
        <div className="statTile">
          <span>NIL Spent</span>
          <strong>{teamContext.nilProgramPointsSpent ?? '—'}</strong>
        </div>
        <div className="statTile">
          <span>Remaining Pts</span>
          <strong>{teamContext.remainingProgramPoints ?? '—'}</strong>
        </div>
        <div className="statTile">
          <span>Budget</span>
          <strong>{teamContext.programPointBudget ?? '—'}</strong>
        </div>
        <div className="statTile">
          <span>Coach</span>
          <strong style={{ fontSize: '1.2rem' }}>{teamContext.coachName || '—'}</strong>
        </div>
      </div>

      {Object.keys(grades).length > 0 && (
        <div className="panel" style={{ padding: 14, marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>School Grades</strong>
          <div className="detailGrid">
            {Object.entries(grades).map(([key, value]) => (
              <div key={key} className="statTile">
                <span>{humanize(key)}</span>
                <strong style={{ fontSize: '1.3rem' }}>{formatGrade(value)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {allowNilUpdates && (
        <div className="panel sourcePanel" style={{ marginBottom: 16 }}>
          <strong>Program Points (writes to save)</strong>
          <div className="row">
            <input
              type="number"
              value={nilValue}
              onChange={(e) => setNilValue(e.target.value)}
              placeholder="NIL points"
            />
            <button type="button" className="buttonGhost" disabled={busy} onClick={updateNil}>
              Update NIL
            </button>
          </div>
          <div className="row">
            <input
              type="number"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              placeholder="Total budget"
            />
            <input
              type="number"
              value={recruitPts}
              onChange={(e) => setRecruitPts(e.target.value)}
              placeholder="Recruiting"
            />
            <input
              type="number"
              value={brandPts}
              onChange={(e) => setBrandPts(e.target.value)}
              placeholder="Brand"
            />
            <input
              type="number"
              value={confPts}
              onChange={(e) => setConfPts(e.target.value)}
              placeholder="Conf prestige"
            />
            <input
              type="number"
              value={tradPts}
              onChange={(e) => setTradPts(e.target.value)}
              placeholder="Traditions"
            />
            <input
              type="number"
              value={stadPts}
              onChange={(e) => setStadPts(e.target.value)}
              placeholder="Stadium"
            />
            <button type="button" className="buttonGhost" disabled={busy} onClick={updatePoints}>
              Update Points
            </button>
          </div>
          <div className="statusLine">{status}</div>
        </div>
      )}

      <div className="filters">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, pitch, trait…"
          style={{ minWidth: 220 }}
        />
        <select value={boardScope} onChange={(e) => setBoardScope(e.target.value as 'all' | 'mine')}>
          <option value="all">Full class</option>
          <option value="mine">My board only</option>
        </select>
        <select
          value={prospectSource}
          onChange={(e) =>
            setProspectSource(e.target.value as 'all' | 'highSchool' | 'transfer' | 'juco')
          }
        >
          <option value="all">All prospects</option>
          <option value="highSchool">High school ({formatNumber(sourceCounts.highSchool)})</option>
          <option value="transfer">Transfers ({formatNumber(sourceCounts.transfer)})</option>
          <option value="juco">JUCO ({formatNumber(sourceCounts.juco)})</option>
        </select>
        {(prospectSource === 'transfer' || prospectSource === 'juco') && (
          <select value={classYear} onChange={(e) => setClassYear(e.target.value)}>
            <option value="">All class years</option>
            {classYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        <select
          value={position}
          onChange={(e) => {
            setPosition(e.target.value);
          }}
        >
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="ratingFilterWrap">
          <button
            type="button"
            className="buttonGhost"
            disabled={!position}
            title={position ? `Filter ${position} key ratings` : 'Select a position first'}
            onClick={() => setRatingFilterOpen((open) => !open)}
            data-active={activeRatingFilters.length > 0 || ratingFilterOpen}
          >
            Key ratings
            {activeRatingFilters.length > 0 ? ` (${activeRatingFilters.length})` : ''}
          </button>
          {ratingFilterOpen && position && (
            <>
              <div className="ratingFilterBackdrop" onClick={() => setRatingFilterOpen(false)} />
              <div className="ratingFilterPopup" role="dialog" aria-label={`${position} key rating filters`}>
                <div className="ratingFilterHead">
                  <div>
                    <strong>{position} key ratings</strong>
                    <p>Set minimums for scout attributes. Leave blank to ignore.</p>
                  </div>
                  <button type="button" className="buttonGhost" onClick={() => setRatingFilterOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="ratingFilterGrid">
                  {positionKeyAttrs.map((attr) => (
                    <label key={attr.key} className="ratingFilterRow">
                      <span title={attr.label}>
                        <strong>{attr.short}</strong>
                        <em>{attr.label}</em>
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        inputMode="numeric"
                        placeholder="Min"
                        value={ratingMins[attr.key] || ''}
                        onChange={(e) =>
                          setRatingMins((prev) => ({
                            ...prev,
                            [attr.key]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="ratingFilterActions">
                  <button
                    type="button"
                    className="buttonGhost"
                    onClick={() => setRatingMins({})}
                    disabled={activeRatingFilters.length === 0}
                  >
                    Clear
                  </button>
                  <button type="button" className="button" onClick={() => setRatingFilterOpen(false)}>
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        <select value={stars} onChange={(e) => setStars(e.target.value)}>
          <option value="">All stars</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={String(s)}>
              {s}★
            </option>
          ))}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        {showDevTraits && (
          <select value={dev} onChange={(e) => setDev(e.target.value)}>
            <option value="">All dev traits</option>
            {devs.map((d) => (
              <option key={d} value={d}>
                {humanize(d)}
              </option>
            ))}
          </select>
        )}
        {showOverall && (
          <input
            type="number"
            value={minOvr}
            onChange={(e) => setMinOvr(e.target.value)}
            placeholder="Min OVR"
            style={{ minWidth: 100 }}
          />
        )}
      </div>

      {activeRatingFilters.length > 0 && (
        <div className="ratingFilterChips">
          {activeRatingFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="ratingFilterChip"
              title={`Clear ${filter.label} min`}
              onClick={() =>
                setRatingMins((prev) => {
                  const next = { ...prev };
                  delete next[filter.key];
                  return next;
                })
              }
            >
              {filter.short} ≥ {filter.min} ×
            </button>
          ))}
        </div>
      )}

      <div className="panel tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              {tableColumns.map(([key, label]) => (
                <th key={key} style={{ cursor: 'pointer' }} onClick={() => toggleSort(key)}>
                  {label}
                  {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, 500).map((r, idx) => (
              <tr
                key={`${r.recruitRow ?? idx}-${r.firstName}-${r.lastName}`}
                onClick={() => setSelected(r)}
                style={{ cursor: 'pointer' }}
              >
                <td>{r.nationalRank || '—'}</td>
                <td>{r.firstName}</td>
                <td>{r.lastName}</td>
                <td>{r.position}</td>
                <td>{r.stars}</td>
                {showTransferColumns && <td>{r.transferFrom || '—'}</td>}
                {showTransferColumns && <td>{r.classYear || '—'}</td>}
                {showOverall && <td>{r.overall ?? '—'}</td>}
                {showDevTraits && <td>{humanize(r.devTrait)}</td>}
                <td>{r.offerCount}</td>
                <td>{humanize(r.recruitStage)}</td>
                <td>{humanize(r.dealbreaker)}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={tableColumns.length}>
                  {boardScope === 'mine'
                    ? recruits.some((r) => r.onMyBoard)
                      ? 'No recruits match these filters on your board.'
                      : 'No recruits marked on your board in this extract. Re-extract Recruiting to refresh your board.'
                    : 'No recruits match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {visible.length > 500 && (
          <div className="emptyState">Showing first 500 of {formatNumber(visible.length)} matches.</div>
        )}
      </div>

      {selected && (
        <>
          <div className="drawerBackdrop" onClick={() => setSelected(null)} />
          <aside className="drawer" aria-label="Recruit details">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                  {selected.firstName} {selected.lastName}
                </h2>
                <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>
                  {selected.position} · {selected.stars}★
                  {showOverall ? ` · OVR ${selected.overall ?? '—'}` : ''}
                </p>
              </div>
              <button type="button" className="buttonGhost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className="detailGrid" style={{ marginTop: 16 }}>
              {showDevTraits && (
                <div className="statTile">
                  <span>Dev</span>
                  <strong style={{ fontSize: '1.1rem' }}>{humanize(selected.devTrait)}</strong>
                </div>
              )}
              <div className="statTile">
                <span>Offers</span>
                <strong>{selected.offerCount}</strong>
              </div>
              <div className="statTile">
                <span>Stage</span>
                <strong style={{ fontSize: '1.1rem' }}>{humanize(selected.recruitStage)}</strong>
              </div>
              <div className="statTile">
                <span>DB Fit</span>
                <strong style={{ fontSize: '1.1rem' }}>{humanize(selected.dealbreakerStatus)}</strong>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Recruiting</h3>
              <p>
                Prospect:{' '}
                {selected.prospectSource === 'transfer'
                  ? 'Transfer'
                  : selected.prospectSource === 'juco'
                    ? 'JUCO'
                    : selected.prospectSource === 'highSchool'
                      ? 'High school'
                      : humanize(selected.recruitClass) || '—'}
              </p>
              {(selected.isTransfer ||
                selected.isJuco ||
                selected.prospectSource === 'transfer' ||
                selected.prospectSource === 'juco') && (
                <>
                  <p>From: {selected.transferFrom || '—'}</p>
                  <p>Class year: {selected.classYear || '—'}</p>
                </>
              )}
              <p>Archetype: {selected.archetypeLabel || humanize(selected.playerType) || '—'}</p>
              <p>Dealbreaker: {humanize(selected.dealbreaker)} ({formatGrade(selected.dealbreakerSchoolGrade)})</p>
              <p>Ideal pitch: {humanize(selected.idealPitch) || '—'}</p>
              <p>Active pitches: {humanize(selected.activePitches) || '—'}</p>
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

            {selected.ratings && Object.keys(selected.ratings).length > 0 ? (
              <RecruitRatingsPanel
                ratings={selected.ratings}
                position={selected.position}
                playerType={selected.playerType}
              />
            ) : (
              <div style={{ marginTop: 18 }}>
                <h3>Attributes</h3>
                <p style={{ color: 'var(--muted)' }}>
                  No ratings in this extract. Re-extract recruiting to load attributes.
                </p>
              </div>
            )}

            {!!selected.topSchools?.length && (
              <div style={{ marginTop: 18 }}>
                <h3>Top Schools</h3>
                <div className="panel tableWrap">
                  <table className="dataTable">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>School</th>
                        <th>Inf</th>
                        <th>Offer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.topSchools.map((s) => (
                        <tr key={`${s.rank}-${s.teamLabel}`}>
                          <td>{s.rank}</td>
                          <td>{s.teamLabel}</td>
                          <td>{s.influence}</td>
                          <td>{humanize(s.scholarshipStatus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </section>
  );
}
