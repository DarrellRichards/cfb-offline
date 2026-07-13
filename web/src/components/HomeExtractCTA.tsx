'use client';

import { useExtract } from './ExtractProvider';

export function HomeExtractCTA() {
  const { extractLatest, openPanel, busy, lastSaveName, saves } = useExtract();

  return (
    <div className="emptyExtract">
      <p>
        {saves[0]
          ? `Ready to load ${saves[0].name}.`
          : 'Point the desk at a CFB dynasty save to populate the site.'}
      </p>
      <div className="ctaRow">
        <button type="button" className="button buttonLarge" onClick={() => extractLatest()} disabled={busy}>
          {busy ? 'Extracting…' : saves[0] ? 'Extract latest dynasty' : 'Find dynasty saves'}
        </button>
        <button type="button" className="buttonGhost" onClick={openPanel} disabled={busy}>
          Choose manually
        </button>
      </div>
      {lastSaveName && <p className="emptyExtractHint">Last used: {lastSaveName}</p>}
    </div>
  );
}
