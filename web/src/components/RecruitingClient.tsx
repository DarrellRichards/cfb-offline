'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClientDate } from '@/lib/ClientDate';
import { formatNumber } from '@/lib/format';
import { useSettings } from './SettingsProvider';

type Recruit = {
  firstName: string;
  lastName: string;
  position: string;
  playerType?: string;
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
  idealPitch?: string;
  activePitches?: string;
  swayPitch?: string;
  physicalAbilities?: string;
  boardRow?: number;
  recruitRow?: number;
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
  const showDevTraits = settings.recruitingDevTraits;
  const allowNilUpdates = settings.nilUpdates;

  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [stars, setStars] = useState('');
  const [stage, setStage] = useState('');
  const [dev, setDev] = useState('');
  const [minOvr, setMinOvr] = useState('');
  const [sortKey, setSortKey] = useState<keyof Recruit | 'nationalRank'>('nationalRank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Recruit | null>(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = Number(minOvr);
    let rows = recruits.filter((r) => {
      if (position && r.position !== position) return false;
      if (stars && String(r.stars) !== stars) return false;
      if (stage && r.recruitStage !== stage) return false;
      if (dev && r.devTrait !== dev) return false;
      if (Number.isFinite(min) && min > 0 && !(Number(r.overall) >= min)) return false;
      if (q) {
        const hay = [
          r.firstName,
          r.lastName,
          r.position,
          r.dealbreaker,
          r.idealPitch,
          r.physicalAbilities,
          r.devTrait,
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
  }, [recruits, search, position, stars, stage, dev, minOvr, sortKey, sortDir]);

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
      ['overall', 'OVR'],
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
            {formatNumber(recruits.length)} extracted
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
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">All positions</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
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
                <td>{r.overall ?? '—'}</td>
                {showDevTraits && <td>{humanize(r.devTrait)}</td>}
                <td>{r.offerCount}</td>
                <td>{humanize(r.recruitStage)}</td>
                <td>{humanize(r.dealbreaker)}</td>
              </tr>
            ))}
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
                  {selected.position} · {selected.stars}★ · OVR {selected.overall ?? '—'}
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
              <p>Dealbreaker: {humanize(selected.dealbreaker)} ({formatGrade(selected.dealbreakerSchoolGrade)})</p>
              <p>Ideal pitch: {humanize(selected.idealPitch) || '—'}</p>
              <p>Active pitches: {humanize(selected.activePitches) || '—'}</p>
              <p>Physical: {selected.physicalAbilities || '—'}</p>
            </div>

            {selected.ratings && (
              <div style={{ marginTop: 18 }}>
                <h3>Ratings</h3>
                <div className="detailGrid">
                  {Object.entries(selected.ratings)
                    .slice(0, 24)
                    .map(([key, value]) => (
                      <div className="statTile" key={key}>
                        <span>{humanize(key.replace(/Rating$/i, ''))}</span>
                        <strong style={{ fontSize: '1.2rem' }}>{value}</strong>
                      </div>
                    ))}
                </div>
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
