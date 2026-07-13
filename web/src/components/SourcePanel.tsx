'use client';

import { ClientDate } from '@/lib/ClientDate';
import { EXTRACT_STEPS, useExtract } from './ExtractProvider';

export function SourcePanel() {
  const {
    panelOpen,
    closePanel,
    busy,
    status,
    steps,
    dir,
    setDir,
    saves,
    savePath,
    setSavePath,
    lastSaveName,
    isDesktop,
    refreshSaves,
    pickLatest,
    pickSaveFile,
    extractLatest,
    extractSelected,
    extractPath,
  } = useExtract();

  if (!panelOpen) return null;

  const latest = saves[0];

  async function browseAndExtract() {
    const selected = await pickSaveFile();
    if (selected) {
      await extractPath(selected, 'all');
    }
  }

  async function browseFolder() {
    if (window.cfbDesktop?.pickDir) {
      const selected = await window.cfbDesktop.pickDir();
      if (selected) {
        setDir(selected);
        await refreshSaves();
      }
      return;
    }
    await refreshSaves();
  }

  return (
    <>
      <div className="drawerBackdrop" onClick={busy ? undefined : closePanel} />
      <aside className="drawer extractDrawer" aria-label="Extract dynasty">
        <div className="drawerHead">
          <div>
            <p className="eyebrow">Dynasty source</p>
            <h2>{isDesktop ? 'Select a save' : 'Load your save'}</h2>
            <p className="drawerLead">
              {isDesktop
                ? 'Pick a DYNASTY file to refresh league, schedule, rankings, stats, and recruiting.'
                : 'One click pulls league, schedule, rankings, stats, and recruiting into the site.'}
            </p>
          </div>
          <button type="button" className="buttonGhost" onClick={closePanel} disabled={busy}>
            Close
          </button>
        </div>

        <div className="extractHeroAction">
          <div>
            <div className="extractLatestLabel">{isDesktop ? 'Selected save' : 'Latest detected'}</div>
            <div className="extractLatestName">
              {lastSaveName || latest?.name || 'No dynasty file selected'}
            </div>
            {latest && !isDesktop && (
              <div className="extractLatestMeta">
                Updated <ClientDate value={latest.mtimeMs} />
              </div>
            )}
          </div>
          <div className="row">
            {isDesktop ? (
              <button
                type="button"
                className="button buttonLarge"
                onClick={() => browseAndExtract()}
                disabled={busy}
              >
                {busy ? 'Extracting…' : 'Browse & extract'}
              </button>
            ) : (
              <button
                type="button"
                className="button buttonLarge"
                onClick={() => extractLatest()}
                disabled={busy || !latest}
              >
                {busy ? 'Extracting…' : 'Extract latest'}
              </button>
            )}
          </div>
        </div>

        <div className="extractSteps" aria-label="Extract progress">
          {EXTRACT_STEPS.map((step) => (
            <div key={step.id} className="extractStep" data-state={steps[step.id]}>
              <span className="extractStepDot" />
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        <details className="extractAdvanced" open={isDesktop && !savePath}>
          <summary>Advanced options</summary>
          <div className="sourcePanel">
            <label>
              Saves folder
              <div className="row" style={{ marginTop: 6 }}>
                <input value={dir} onChange={(e) => setDir(e.target.value)} disabled={busy} />
                <button type="button" className="buttonGhost" onClick={browseFolder} disabled={busy}>
                  {isDesktop ? 'Browse' : 'Scan'}
                </button>
                <button type="button" className="buttonGhost" onClick={refreshSaves} disabled={busy}>
                  Scan
                </button>
              </div>
            </label>

            <label>
              Choose file
              <select
                value={saves.some((s) => s.fullPath === savePath) ? savePath : ''}
                onChange={(e) => setSavePath(e.target.value)}
                style={{ width: '100%', marginTop: 6 }}
                disabled={busy}
              >
                {saves.length === 0 && <option value="">No DYNASTY files</option>}
                {saves.map((save) => (
                  <option key={save.fullPath} value={save.fullPath}>
                    {save.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Or paste path
              <input
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="/path/to/DYNASTY-..."
                style={{ width: '100%', marginTop: 6 }}
                disabled={busy}
              />
            </label>

            <div className="row">
              <button type="button" className="buttonGhost" onClick={pickLatest} disabled={busy || !latest}>
                Use latest
              </button>
              {isDesktop && (
                <button type="button" className="buttonGhost" onClick={() => pickSaveFile()} disabled={busy}>
                  Browse file
                </button>
              )}
              <button
                type="button"
                className="button"
                onClick={() => extractSelected('all')}
                disabled={busy || !savePath}
              >
                Extract selected
              </button>
            </div>
          </div>
        </details>

        <div className={`statusLine ${busy ? 'isBusy' : ''}`}>{status}</div>
      </aside>
    </>
  );
}
