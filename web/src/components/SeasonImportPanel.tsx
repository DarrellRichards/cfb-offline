'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExtract } from './ExtractProvider';

type PreviewResult = {
  ok: boolean;
  preview?: boolean;
  seasonYear: number;
  gameCount: number;
  warnings: string[];
  unmatchedTeamCount: number;
  exists: boolean;
  existingSeasonId: number | null;
  summary?: {
    userTeam?: string;
    wins?: number;
    losses?: number;
    ties?: number;
  };
  error?: string;
};

type ImportResult = {
  ok: boolean;
  seasonId: number;
  seasonYear: number;
  gameCount: number;
  warnings: string[];
  replaced?: boolean;
  error?: string;
};

export function SeasonImportPanel() {
  const router = useRouter();
  const { savePath, setSavePath, saves, lastSaveName, isDesktop, pickSaveFile } = useExtract();
  const [summaryFile, setSummaryFile] = useState<File | null>(null);
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [seasonYear, setSeasonYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);

  const canRun = Boolean(savePath && summaryFile && scheduleFile);

  const saveOptions = useMemo(() => saves, [saves]);

  const buildForm = useCallback(
    (previewOnly: boolean, replace: boolean) => {
      const form = new FormData();
      form.set('savePath', savePath);
      form.set('replace', replace ? 'true' : 'false');
      form.set('previewOnly', previewOnly ? 'true' : 'false');
      if (seasonYear.trim()) form.set('seasonYear', seasonYear.trim());
      if (summaryFile) form.set('summary', summaryFile);
      if (scheduleFile) form.set('schedule', scheduleFile);
      return form;
    },
    [savePath, seasonYear, summaryFile, scheduleFile]
  );

  async function runPreview() {
    if (!canRun) return;
    setBusy(true);
    setStatus('Validating…');
    setImported(null);
    try {
      const res = await fetch('/api/seasons/import', {
        method: 'POST',
        body: buildForm(true, false),
      });
      const data = (await res.json()) as PreviewResult;
      if (!res.ok) {
        setPreview(null);
        setStatus(data.error || 'Preview failed.');
        return;
      }
      setPreview(data);
      setStatus(
        `Ready: ${data.seasonYear} · ${data.gameCount} games${
          data.exists ? ' (will replace existing archive)' : ''
        }`
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (!canRun) return;
    if (preview?.exists) {
      const ok = window.confirm(
        `Season ${preview.seasonYear} already exists in the archive. Replace it?`
      );
      if (!ok) return;
    }
    setBusy(true);
    setStatus('Importing…');
    try {
      // Preview first if user skipped it, so overwrite confirm still works.
      let exists = preview?.exists || false;
      let year = preview?.seasonYear;
      if (!preview) {
        const preRes = await fetch('/api/seasons/import', {
          method: 'POST',
          body: buildForm(true, false),
        });
        const preData = (await preRes.json()) as PreviewResult;
        if (!preRes.ok) {
          setStatus(preData.error || 'Import failed.');
          return;
        }
        setPreview(preData);
        exists = preData.exists;
        year = preData.seasonYear;
        if (exists) {
          const ok = window.confirm(`Season ${year} already exists in the archive. Replace it?`);
          if (!ok) {
            setStatus('Import cancelled.');
            return;
          }
        }
      }

      const res = await fetch('/api/seasons/import', {
        method: 'POST',
        body: buildForm(false, true),
      });
      const data = (await res.json()) as ImportResult;
      if (!res.ok) {
        setStatus(data.error || 'Import failed.');
        return;
      }
      setImported(data);
      setStatus(
        `Imported ${data.seasonYear} (${data.gameCount} games)${
          data.replaced ? ' — replaced existing' : ''
        }.`
      );
      window.dispatchEvent(new Event('cfb-seasons-changed'));
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function openImportedSeason() {
    if (!imported?.seasonId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonId: imported.seasonId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || 'Failed to open season.');
        return;
      }
      setStatus(`Viewing ${imported.seasonYear} archive.`);
      window.dispatchEvent(new Event('cfb-seasons-changed'));
      router.refresh();
      router.push('/schedule');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function browseSave() {
    const selected = await pickSaveFile();
    if (selected) setSavePath(selected);
  }

  return (
    <section className="section" style={{ marginTop: 28 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">History</p>
          <h2>Import past season</h2>
          <p>
            Backfill a season you never extracted mid-dynasty. Download the CSV templates (open in
            Excel), fill schedule + summary, then import into the archive.
          </p>
        </div>
      </div>

      <div className="panel" style={{ padding: 16, display: 'grid', gap: 14 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <a className="buttonGhost" href="/templates/season-summary.csv" download>
            Download season summary
          </a>
          <a className="buttonGhost" href="/templates/schedule.csv" download>
            Download schedule
          </a>
        </div>

        <label>
          Dynasty save
          <div className="row" style={{ marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
            {saveOptions.length > 0 ? (
              <select
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                disabled={busy}
                style={{ minWidth: 280 }}
              >
                <option value="">Select a save…</option>
                {saveOptions.map((s) => (
                  <option key={s.fullPath} value={s.fullPath}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="Path to DYNASTY save"
                disabled={busy}
                style={{ minWidth: 280 }}
              />
            )}
            {isDesktop && (
              <button type="button" className="buttonGhost" onClick={browseSave} disabled={busy}>
                Browse…
              </button>
            )}
          </div>
          {lastSaveName && (
            <div className="settingsDesc" style={{ marginTop: 4 }}>
              Selected: {lastSaveName}
            </div>
          )}
        </label>

        <label>
          Season year override (optional)
          <input
            style={{ display: 'block', marginTop: 6, maxWidth: 160 }}
            value={seasonYear}
            onChange={(e) => setSeasonYear(e.target.value)}
            placeholder="From summary CSV"
            disabled={busy}
          />
        </label>

        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label>
            Season summary CSV
            <input
              style={{ display: 'block', marginTop: 6 }}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                setSummaryFile(e.target.files?.[0] || null);
                setPreview(null);
                setImported(null);
              }}
            />
          </label>
          <label>
            Schedule CSV
            <input
              style={{ display: 'block', marginTop: 6 }}
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                setScheduleFile(e.target.files?.[0] || null);
                setPreview(null);
                setImported(null);
              }}
            />
          </label>
        </div>

        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="buttonGhost" onClick={runPreview} disabled={!canRun || busy}>
            Preview
          </button>
          <button type="button" className="button" onClick={runImport} disabled={!canRun || busy}>
            {busy ? 'Working…' : 'Import into archive'}
          </button>
          {imported?.seasonId ? (
            <button type="button" className="buttonGhost" onClick={openImportedSeason} disabled={busy}>
              Open {imported.seasonYear} schedule
            </button>
          ) : null}
        </div>

        {status ? <p style={{ margin: 0 }}>{status}</p> : null}

        {preview ? (
          <div className="settingsDesc">
            <div>
              Preview · {preview.seasonYear}
              {preview.summary?.userTeam ? ` · ${preview.summary.userTeam}` : ''}
              {preview.summary
                ? ` · ${preview.summary.wins ?? 0}-${preview.summary.losses ?? 0}${
                    preview.summary.ties ? `-${preview.summary.ties}` : ''
                  }`
                : ''}
              {' · '}
              {preview.gameCount} games
              {preview.exists ? ' · exists (replace on import)' : ''}
            </div>
            {preview.warnings?.length ? (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {preview.warnings.slice(0, 12).map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {preview.warnings.length > 12 ? (
                  <li>+{preview.warnings.length - 12} more…</li>
                ) : null}
              </ul>
            ) : (
              <div style={{ marginTop: 6 }}>No warnings.</div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
