export type NewsSource = 'manual' | 'ai' | 'auto';

export type NewsArticle = {
  id: string;
  seasonYear: number;
  week: number;
  weekType: string;
  title: string;
  dek: string;
  body: string;
  source: NewsSource;
  createdAt: string;
  updatedAt: string;
};

export type NewsStore = {
  version: 1;
  updatedAt: string;
  articles: NewsArticle[];
};

export type NewsArticleInput = {
  seasonYear: number;
  week: number;
  weekType?: string;
  title: string;
  dek?: string;
  body: string;
  source?: NewsSource;
};
