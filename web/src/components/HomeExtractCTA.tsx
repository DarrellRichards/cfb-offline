'use client';

import { useRef } from 'react';
import { useExtract } from './ExtractProvider';

export function HomeExtractCTA() {
  const { extractLatest, openPanel, busy, lastSaveName, saves, isDesktop, uploadAndExtract } = useExtract();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="emptyExtract">
      <p>
        {isDesktop
          ? saves[0]
            ? `Ready to load ${saves[0].name}.`
            : 'Point the desk at a CFB dynasty save to populate the site.'
          : 'Upload a DYNASTY save to browse scores, polls, rosters, and more. Hosted uploads are view-only.'}
      </p>
      <div className="ctaRow">
        {!isDesktop && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".save,.db,.franchise,DYNASTY*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAndExtract(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="button buttonLarge"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {busy ? 'Working…' : 'Upload dynasty save'}
            </button>
          </>
        )}
        {isDesktop && (
          <button type="button" className="button buttonLarge" onClick={() => extractLatest()} disabled={busy}>
            {busy ? 'Extracting…' : saves[0] ? 'Extract latest dynasty' : 'Find dynasty saves'}
          </button>
        )}
        <button type="button" className="buttonGhost" onClick={openPanel} disabled={busy}>
          {isDesktop ? 'Choose manually' : 'More options'}
        </button>
      </div>
      {lastSaveName && <p className="emptyExtractHint">Last used: {lastSaveName}</p>}
    </div>
  );
}
