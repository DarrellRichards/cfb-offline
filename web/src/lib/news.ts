import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { DATA_DIR } from '@/lib/data';
import type { NewsArticle, NewsArticleInput, NewsSource, NewsStore } from '@/lib/news-types';

export type { NewsArticle, NewsArticleInput, NewsSource, NewsStore } from '@/lib/news-types';

const NEWS_FILE = 'news.json';

function emptyStore(): NewsStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    articles: [],
  };
}

export function newsPath() {
  return path.join(DATA_DIR, NEWS_FILE);
}

export function readNewsStore(): NewsStore {
  const filePath = newsPath();
  if (!fs.existsSync(filePath)) return emptyStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<NewsStore>;
    return {
      version: 1,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      articles: Array.isArray(parsed.articles) ? (parsed.articles as NewsArticle[]) : [],
    };
  } catch {
    return emptyStore();
  }
}

export function writeNewsStore(store: NewsStore) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const next: NewsStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    articles: store.articles,
  };
  fs.writeFileSync(newsPath(), JSON.stringify(next, null, 2));
  return next;
}

function normalizeArticleInput(input: NewsArticleInput) {
  const seasonYear = Number(input.seasonYear);
  const week = Number(input.week);
  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  const dek = String(input.dek || '').trim();
  const weekType = String(input.weekType || 'RegularSeason').trim() || 'RegularSeason';
  const source: NewsSource =
    input.source === 'ai' ? 'ai' : input.source === 'auto' ? 'auto' : 'manual';

  if (!Number.isFinite(seasonYear) || seasonYear < 1900 || seasonYear > 3000) {
    throw new Error('Valid seasonYear required.');
  }
  if (!Number.isFinite(week) || week < 0 || week > 40) {
    throw new Error('Valid week required (0–40).');
  }
  if (!title) throw new Error('Title required.');
  if (!body) throw new Error('Body required.');

  return { seasonYear, week, weekType, title, dek, body, source };
}

export function listNewsArticles(filters?: {
  seasonYear?: number;
  week?: number;
}) {
  const store = readNewsStore();
  let articles = [...store.articles];
  if (filters?.seasonYear != null) {
    articles = articles.filter((a) => a.seasonYear === filters.seasonYear);
  }
  if (filters?.week != null) {
    articles = articles.filter((a) => a.week === filters.week);
  }
  return articles.sort((a, b) => {
    if (a.seasonYear !== b.seasonYear) return b.seasonYear - a.seasonYear;
    if (a.week !== b.week) return b.week - a.week;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function createNewsArticle(input: NewsArticleInput) {
  const normalized = normalizeArticleInput(input);
  const now = new Date().toISOString();
  const article: NewsArticle = {
    id: randomUUID(),
    ...normalized,
    createdAt: now,
    updatedAt: now,
  };
  const store = readNewsStore();
  store.articles.unshift(article);
  writeNewsStore(store);
  return article;
}

export function updateNewsArticle(id: string, input: Partial<NewsArticleInput>) {
  const store = readNewsStore();
  const index = store.articles.findIndex((a) => a.id === id);
  if (index < 0) throw new Error('Article not found.');
  const current = store.articles[index];
  const normalized = normalizeArticleInput({
    seasonYear: input.seasonYear ?? current.seasonYear,
    week: input.week ?? current.week,
    weekType: input.weekType ?? current.weekType,
    title: input.title ?? current.title,
    dek: input.dek ?? current.dek,
    body: input.body ?? current.body,
    source: input.source ?? current.source,
  });
  const next: NewsArticle = {
    ...current,
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
  store.articles[index] = next;
  writeNewsStore(store);
  return next;
}

export function deleteNewsArticle(id: string) {
  const store = readNewsStore();
  const nextArticles = store.articles.filter((a) => a.id !== id);
  if (nextArticles.length === store.articles.length) {
    throw new Error('Article not found.');
  }
  writeNewsStore({ ...store, articles: nextArticles });
  return { ok: true as const, id };
}

export function newsSeasonYears(fallbackYears: number[] = []) {
  const fromArticles = readNewsStore().articles.map((a) => a.seasonYear);
  return [...new Set([...fromArticles, ...fallbackYears].filter((y) => Number.isFinite(y) && y > 0))].sort(
    (a, b) => b - a
  );
}
