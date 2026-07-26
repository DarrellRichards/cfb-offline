'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NewsArticle, NewsSource } from '@/lib/news-types';

type NewsBootstrap = {
  seasonYears: number[];
  currentSeasonYear: number | null;
  currentWeek: number | null;
  currentWeekType: string;
  weeks: number[];
  articles: NewsArticle[];
};

type AiEntitlement = {
  unlocked: boolean;
  reason: string;
  providerReady: boolean;
  provider: string;
  mode: string;
};

type DraftForm = {
  id?: string;
  seasonYear: number;
  week: number;
  weekType: string;
  title: string;
  dek: string;
  body: string;
  source: NewsSource;
};

function emptyDraft(year: number, week: number, weekType: string): DraftForm {
  return {
    seasonYear: year,
    week,
    weekType,
    title: '',
    dek: '',
    body: '',
    source: 'manual',
  };
}

export function NewsClient({ initial }: { initial: NewsBootstrap }) {
  const defaultYear = initial.currentSeasonYear || initial.seasonYears[0] || new Date().getFullYear();
  const defaultWeek = initial.currentWeek ?? initial.weeks[0] ?? 1;

  const [seasonYear, setSeasonYear] = useState(defaultYear);
  const [week, setWeek] = useState(defaultWeek);
  const [weekType, setWeekType] = useState(initial.currentWeekType || 'RegularSeason');
  const [seasonYears, setSeasonYears] = useState(initial.seasonYears);
  const [weeks, setWeeks] = useState(initial.weeks);
  const [articles, setArticles] = useState(initial.articles);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftForm>(() => emptyDraft(defaultYear, defaultWeek, weekType));
  const [entitlement, setEntitlement] = useState<AiEntitlement | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => articles.find((a) => a.id === selectedId) || null,
    [articles, selectedId]
  );

  const refresh = useCallback(async (nextYear = seasonYear, nextWeek = week) => {
    const res = await fetch(`/api/news?seasonYear=${nextYear}&week=${nextWeek}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load news');
    setSeasonYears(json.seasonYears || []);
    setWeeks(json.weeks || []);
    setArticles(json.articles || []);
    if (json.currentWeekType) setWeekType(json.currentWeekType);
    return json as NewsBootstrap;
  }, [seasonYear, week]);

  useEffect(() => {
    fetch('/api/news/generate')
      .then((res) => res.json())
      .then((json) => setEntitlement(json.entitlement || null))
      .catch(() => setEntitlement(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const json = await refresh(seasonYear, week);
        if (cancelled) return;
        if (!json.weeks?.includes(week) && json.weeks?.length) {
          setWeek(json.weeks.includes(defaultWeek) ? defaultWeek : json.weeks[0]);
        }
      } catch (err) {
        if (!cancelled) setStatus(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentional: reload when year/week filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonYear, week]);

  function beginCompose() {
    setDraft(emptyDraft(seasonYear, week, weekType));
    setEditing(true);
    setSelectedId(null);
    setStatus('');
  }

  function beginEdit(article: NewsArticle) {
    setDraft({
      id: article.id,
      seasonYear: article.seasonYear,
      week: article.week,
      weekType: article.weekType,
      title: article.title,
      dek: article.dek,
      body: article.body,
      source: article.source,
    });
    setEditing(true);
    setSelectedId(article.id);
    setStatus('');
  }

  async function saveDraft() {
    setBusy(true);
    setStatus(draft.id ? 'Updating article…' : 'Saving article…');
    try {
      const res = await fetch('/api/news', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setSeasonYear(json.article.seasonYear);
      setWeek(json.article.week);
      await refresh(json.article.seasonYear, json.article.week);
      setSelectedId(json.article.id);
      setEditing(false);
      setStatus('Article saved to the local news desk.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeArticle(id: string) {
    if (!window.confirm('Delete this article?')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/news', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Delete failed');
      await refresh();
      setSelectedId(null);
      setEditing(false);
      setStatus('Article deleted.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function unlockAi() {
    setBusy(true);
    setStatus('Checking license…');
    try {
      const res = await fetch('/api/news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', licenseKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unlock failed');
      setEntitlement(json.entitlement);
      setLicenseKey('');
      setStatus('AI News unlocked on this device.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function generateAiDraft() {
    setBusy(true);
    setStatus('Generating AI draft from this week’s extract…');
    try {
      const res = await fetch('/api/news/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          seasonYear,
          week,
          weekType,
          save: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.entitlement) setEntitlement(json.entitlement);
        throw new Error(json.error || 'AI generate failed');
      }
      setDraft({
        seasonYear,
        week,
        weekType,
        title: json.draft.title,
        dek: json.draft.dek || '',
        body: json.draft.body,
        source: 'ai',
      });
      setEditing(true);
      setSelectedId(null);
      setStatus(`AI draft ready (${json.draft.provider}${json.draft.model ? ` · ${json.draft.model}` : ''}). Edit, then save.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" style={{ marginTop: 8 }}>
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Dynasty wire</p>
          <h2>News</h2>
          <p>Write the season week by week — local articles stay with your desk, not the save file.</p>
        </div>
        <div className="row">
          <button type="button" className="button" onClick={beginCompose} disabled={busy}>
            New article
          </button>
        </div>
      </div>

      <div className="filters">
        <label className="newsFilter">
          <span>Season</span>
          <select
            value={String(seasonYear)}
            onChange={(e) => setSeasonYear(Number(e.target.value))}
            disabled={busy}
          >
            {(seasonYears.length ? seasonYears : [seasonYear]).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="newsFilter">
          <span>Week</span>
          <select value={String(week)} onChange={(e) => setWeek(Number(e.target.value))} disabled={busy}>
            {(weeks.length ? weeks : [week]).map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="buttonGhost" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </button>
      </div>

      <div className="newsLayout">
        <div className="newsList">
          {articles.length === 0 && (
            <div className="panel emptyState">No articles for {seasonYear} · Week {week} yet.</div>
          )}
          {articles.map((article) => (
            <button
              type="button"
              key={article.id}
              className="newsCard"
              data-active={selectedId === article.id}
              onClick={() => {
                setSelectedId(article.id);
                setEditing(false);
              }}
            >
              <div className="newsCardMeta">
                <span>
                  Week {article.week}
                  {article.source === 'ai' ? ' · AI' : article.source === 'auto' ? ' · Auto' : ''}
                </span>
                <span>{new Date(article.updatedAt).toLocaleDateString()}</span>
              </div>
              <strong>{article.title}</strong>
              {article.dek ? <p>{article.dek}</p> : null}
            </button>
          ))}
        </div>

        <div className="panel newsDesk">
          {editing ? (
            <>
              <div className="sectionHead" style={{ marginBottom: 12 }}>
                <div>
                  <p className="eyebrow">{draft.id ? 'Edit' : 'Compose'}</p>
                  <h3 style={{ margin: 0 }}>{draft.id ? 'Edit article' : 'New article'}</h3>
                </div>
                <button type="button" className="buttonGhost" onClick={() => setEditing(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
              <div className="sourcePanel newsCompose">
                <label>
                  Title
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    disabled={busy}
                  />
                </label>
                <label>
                  Dek / subhead
                  <input
                    value={draft.dek}
                    onChange={(e) => setDraft((d) => ({ ...d, dek: e.target.value }))}
                    disabled={busy}
                  />
                </label>
                <div className="row">
                  <label>
                    Season
                    <input
                      type="number"
                      value={draft.seasonYear}
                      onChange={(e) => setDraft((d) => ({ ...d, seasonYear: Number(e.target.value) }))}
                      disabled={busy}
                    />
                  </label>
                  <label>
                    Week
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={draft.week}
                      onChange={(e) => setDraft((d) => ({ ...d, week: Number(e.target.value) }))}
                      disabled={busy}
                    />
                  </label>
                </div>
                <label>
                  Body
                  <textarea
                    rows={12}
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    disabled={busy}
                    placeholder="Write the week’s story…"
                  />
                </label>
                <div className="row">
                  <button type="button" className="button" onClick={() => void saveDraft()} disabled={busy}>
                    {busy ? 'Saving…' : 'Save article'}
                  </button>
                  {draft.id ? (
                    <button
                      type="button"
                      className="buttonGhost"
                      onClick={() => void removeArticle(draft.id!)}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="sectionHead" style={{ marginBottom: 12 }}>
                <div>
                  <p className="eyebrow">
                    {selected.seasonYear} · Week {selected.week}
                    {selected.source === 'ai'
                      ? ' · AI'
                      : selected.source === 'auto'
                        ? ' · Auto'
                        : ' · Manual'}
                  </p>
                  <h3 style={{ margin: 0 }}>{selected.title}</h3>
                  {selected.dek ? <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{selected.dek}</p> : null}
                </div>
                <button type="button" className="buttonGhost" onClick={() => beginEdit(selected)} disabled={busy}>
                  Edit
                </button>
              </div>
              <div className="newsBody">
                {selected.body.split(/\n{2,}/).map((para, idx) => (
                  <p key={`${selected.id}-${idx}`}>{para}</p>
                ))}
              </div>
            </>
          ) : (
            <div className="emptyState">Select an article or write a new one for this week.</div>
          )}

          <div className="newsAiPanel">
            <strong>AI News (paid add-on)</strong>
            <p>
              {entitlement?.unlocked
                ? entitlement.providerReady
                  ? 'License unlocked. Generate a draft from this week’s scores, GOTW, polls, and awards.'
                  : 'License unlocked, but set OPENAI_API_KEY on the server to generate drafts.'
                : 'Manual writing is free. AI drafting is a paid unlock — enter a CFB-AI-… license key, or enable CFB_AI_NEWS_ENABLED for the install.'}
            </p>
            {!entitlement?.unlocked && (
              <div className="row">
                <input
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="CFB-AI-…"
                  disabled={busy}
                  style={{ minWidth: 220 }}
                />
                <button type="button" className="buttonGhost" onClick={() => void unlockAi()} disabled={busy || !licenseKey}>
                  Unlock
                </button>
              </div>
            )}
            <div className="row" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="buttonGhost"
                onClick={() => void generateAiDraft()}
                disabled={busy || !entitlement?.unlocked}
              >
                Generate AI draft
              </button>
            </div>
          </div>

          {status ? <div className="statusLine">{status}</div> : null}
        </div>
      </div>
    </section>
  );
}
