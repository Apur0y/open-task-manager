export const NEWS_CATEGORIES = [
  "Banking",
  "Economy",
  "Finance",
  "Bangladesh Bank",
  "Inflation",
  "Interest Rate",
  "Remittance",
  "Export/Import",
  "Budget/Tax",
  "IMF/World Bank",
  "Stock Market",
  "International Economy",
  "General",
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_SOURCES = [
  { id: "prothomalo", name: "Prothom Alo", url: "https://www.prothomalo.com" },
  { id: "dailystar", name: "The Daily Star", url: "https://www.thedailystar.net" },
] as const;

export type NewsSourceId = (typeof NEWS_SOURCES)[number]["id"];

export interface NewsArticle {
  _id: string;
  title: string;
  source: NewsSourceId;
  sourceName: string;
  url: string;
  urlHash: string;
  sourceKey: string;
  contentHash: string;
  excerpt: string;
  content: string | null;
  image: string | null;
  category: NewsCategory;
  publishedAt: string;
  publishedDate: string;
  collectedAt: string;
  importance: number;
  read: boolean;
  important: boolean;
  keywords: string[];
}

export interface RawArticle {
  title: string;
  source: NewsSourceId;
  sourceName: string;
  url: string;
  sourceKey: string;
  excerpt: string;
  content: string | null;
  image: string | null;
  publishedAt: Date | null;
}

export interface NewsFilters {
  category?: NewsCategory;
  source?: NewsSourceId;
  q?: string;
  from?: string;
  to?: string;
  important?: boolean;
  read?: boolean;
  sort?: "latest" | "score";
  limit?: number;
  skip?: number;
}

export interface NewsQueryResult {
  articles: NewsArticle[];
  total: number;
  categories: { name: NewsCategory; count: number }[];
}

export interface CollectSourceResult {
  source: NewsSourceId;
  sourceName: string;
  fetched: number;
  inserted: number;
  skipped: number;
  error?: string;
}

export interface CollectResult {
  startedAt: string;
  finishedAt: string;
  sources: CollectSourceResult[];
  totalFetched: number;
  totalInserted: number;
}

export interface BriefingArticle {
  article: NewsArticle;
  keyFacts: string[];
}

export interface DailyBriefing {
  date: string;
  summary: string;
  totalToday: number;
  important: BriefingArticle[];
  latest: BriefingArticle[];
}
