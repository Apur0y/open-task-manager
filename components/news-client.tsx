"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BriefingArticle,
  DailyBriefing,
  NewsArticle,
  NewsCategory,
  NEWS_CATEGORIES,
} from "@/lib/news/types";

interface CategoryCount {
  name: NewsCategory;
  count: number;
}

interface NewsClientProps {
  initialArticles: NewsArticle[];
  initialTotal: number;
  initialCategories: CategoryCount[];
  todayImportant: NewsArticle[];
  initialBriefing: DailyBriefing | null;
  dbError?: string;
}

interface Filters {
  q: string;
  category: string;
  source: string;
  from: string;
  to: string;
  sort: "latest" | "score";
}

type Tab = "latest" | "important" | "briefing";

const DEFAULT_FILTERS: Filters = {
  q: "",
  category: "",
  source: "",
  from: "",
  to: "",
  sort: "latest",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function importanceColor(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200";
  if (score >= 60) return "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200";
  if (score >= 40) return "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
}

export default function NewsClient({
  initialArticles,
  initialTotal,
  initialCategories,
  todayImportant: todayImportantProp,
  initialBriefing,
  dbError,
}: NewsClientProps) {
  const [tab, setTab] = useState<Tab>("latest");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [articles, setArticles] = useState(initialArticles);
  const [total, setTotal] = useState(initialTotal);
  const [categories, setCategories] = useState(initialCategories);
  const [todayImportant, setTodayImportant] = useState(todayImportantProp);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(initialBriefing);
  const [loading, setLoading] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collectMessage, setCollectMessage] = useState<string | null>(null);

  const buildQuery = useCallback(
    (f: Filters, important: boolean) => {
      const sp = new URLSearchParams();
      if (f.q.trim()) sp.set("q", f.q.trim());
      if (f.category) sp.set("category", f.category);
      if (f.source) sp.set("source", f.source);
      if (f.from) sp.set("from", f.from);
      if (f.to) sp.set("to", f.to);
      if (important) sp.set("important", "true");
      sp.set("sort", f.sort);
      sp.set("limit", "40");
      return sp.toString();
    },
    []
  );

  const loadArticles = useCallback(
    async (f: Filters, important: boolean) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?${buildQuery(f, important)}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setArticles(data.articles);
        setTotal(data.total);
        if (data.categories?.length) setCategories(data.categories);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  useEffect(() => {
    let cancelled = false;
    const query = buildQuery(filters, tab === "important");
    const url = tab === "briefing" ? "/api/news/briefing" : `/api/news?${query}`;
    (async () => {
      try {
        const res = await fetch(url);
        if (cancelled || !res.ok) return;
        if (tab === "briefing") {
          setBriefing(await res.json());
        } else {
          const data = await res.json();
          setArticles(data.articles);
          setTotal(data.total);
          if (data.categories?.length) setCategories(data.categories);
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, filters, buildQuery]);

  const patchArticle = useCallback(async (id: string, updates: object) => {
    const res = await fetch(`/api/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update");
    return (await res.json()) as NewsArticle;
  }, []);

  const toggleImportant = useCallback(
    async (article: NewsArticle) => {
      const updated = { ...article, important: !article.important };
      setArticles((prev) => prev.map((a) => (a._id === article._id ? updated : a)));
      setTodayImportant((prev) =>
        article.important
          ? prev.filter((a) => a._id !== article._id)
          : prev.some((a) => a._id === article._id)
            ? prev
            : [updated, ...prev]
      );
      try {
        await patchArticle(article._id, { important: updated.important });
      } catch (err) {
        console.error(err);
      }
    },
    [patchArticle]
  );

  const toggleRead = useCallback(
    async (article: NewsArticle) => {
      const updated = { ...article, read: !article.read };
      setArticles((prev) => prev.map((a) => (a._id === article._id ? updated : a)));
      try {
        await patchArticle(article._id, { read: updated.read });
      } catch (err) {
        console.error(err);
      }
    },
    [patchArticle]
  );

  const runCollect = useCallback(
    async (source?: string) => {
      setCollecting(true);
      setCollectMessage(null);
      try {
        const res = await fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(source ? { sources: [source] } : {}),
        });
        if (!res.ok) throw new Error("Collection failed");
        const data = await res.json();
        const parts = data.sources.map(
          (s: { sourceName: string; inserted: number; fetched: number; error?: string }) =>
            `${s.sourceName}: +${s.inserted} new (${s.fetched} fetched)${s.error ? ` — failed: ${s.error}` : ""}`
        );
        setCollectMessage(parts.join(" | "));
        await loadArticles(filters, tab === "important");
        const b = await fetch("/api/news/briefing");
        if (b.ok) setBriefing(await b.json());
      } catch (err) {
        setCollectMessage(err instanceof Error ? err.message : "Collection failed");
      } finally {
        setCollecting(false);
      }
    },
    [filters, tab, loadArticles]
  );

  if (dbError) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        {dbError}
      </div>
    );
  }

  const setFilter = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <CollectBar
        collecting={collecting}
        message={collectMessage}
        onRun={(source) => runCollect(source)}
      />

      <Tabs tab={tab} onTabChange={setTab} />

      {tab !== "briefing" && (
        <FilterBar
          filters={filters}
          categories={categories}
          onChange={setFilter}
        />
      )}

      {loading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Loading…
        </p>
      )}

      {tab === "briefing" ? (
        briefing ? (
          <BriefingView briefing={briefing} onToggleImportant={toggleImportant} />
        ) : (
          <EmptyState text="No briefing available yet. Run the collector first." />
        )
      ) : (
        <>
          {tab === "latest" && todayImportant.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Today&apos;s Important News
              </h2>
              <div className="space-y-3">
                {todayImportant.map((article) => (
                  <ArticleCard
                    key={article._id}
                    article={article}
                    onToggleImportant={toggleImportant}
                    onToggleRead={toggleRead}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {tab === "important" ? "Important / Saved News" : "Latest News"}
              </h2>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {total} article{total === 1 ? "" : "s"}
              </span>
            </div>
            {articles.length === 0 ? (
              <EmptyState text="No articles match the current filters. Run the collector or adjust filters." />
            ) : (
              <div className="space-y-3">
                {articles.map((article) => (
                  <ArticleCard
                    key={article._id}
                    article={article}
                    onToggleImportant={toggleImportant}
                    onToggleRead={toggleRead}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function CollectBar({
  collecting,
  message,
  onRun,
}: {
  collecting: boolean;
  message: string | null;
  onRun: (source?: string) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-neutral-700 dark:text-neutral-200">
          Collect news
        </span>
        <button
          onClick={() => onRun()}
          disabled={collecting}
          className="rounded-lg bg-neutral-900 px-3 py-1.5 font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {collecting ? "Collecting…" : "Run all sources"}
        </button>
        <button
          onClick={() => onRun("prothomalo")}
          disabled={collecting}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Prothom Alo
        </button>
        <button
          onClick={() => onRun("dailystar")}
          disabled={collecting}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Daily Star
        </button>
        {message && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}

function Tabs({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "latest", label: "Latest" },
    { id: "important", label: "Important / Saved" },
    { id: "briefing", label: "Daily Briefing" },
  ];
  return (
    <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            tab === t.id
              ? "border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
              : "border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function FilterBar({
  filters,
  categories,
  onChange,
}: {
  filters: Filters;
  categories: CategoryCount[];
  onChange: (key: keyof Filters, value: string) => void;
}) {
  const countMap = new Map(categories.map((c) => [c.name, c.count]));
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={filters.q}
          onChange={(e) => onChange("q", e.target.value)}
          placeholder="Search title or summary…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-neutral-900 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:text-neutral-100"
        />
        <select
          value={filters.source}
          onChange={(e) => onChange("source", e.target.value)}
          className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
        >
          <option value="">All sources</option>
          <option value="prothomalo">Prothom Alo</option>
          <option value="dailystar">The Daily Star</option>
        </select>
        <select
          value={filters.sort}
          onChange={(e) => onChange("sort", e.target.value)}
          className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
        >
          <option value="latest">Sort: Newest</option>
          <option value="score">Sort: Importance</option>
        </select>
        <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange("from", e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 dark:border-neutral-700"
          />
          <span>to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange("to", e.target.value)}
            className="rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 dark:border-neutral-700"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <CategoryChip
          active={filters.category === ""}
          label={`All${totalSuffix(countMap)}`}
          onClick={() => onChange("category", "")}
        />
        {NEWS_CATEGORIES.map((cat) => {
          if (cat === "General") return null;
          const count = countMap.get(cat);
          return (
            <CategoryChip
              key={cat}
              active={filters.category === cat}
              label={`${cat}${count ? ` (${count})` : ""}`}
              onClick={() =>
                onChange("category", filters.category === cat ? "" : cat)
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function totalSuffix(countMap: Map<string, number>): string {
  const total = Array.from(countMap.values()).reduce((a, b) => a + b, 0);
  return total > 0 ? ` (${total})` : "";
}

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      }`}
    >
      {label}
    </button>
  );
}

function ArticleCard({
  article,
  onToggleImportant,
  onToggleRead,
}: {
  article: NewsArticle;
  onToggleImportant: (a: NewsArticle) => void;
  onToggleRead: (a: NewsArticle) => void;
}) {
  return (
    <article
      className={`rounded-xl border border-neutral-200 p-4 dark:border-neutral-800 ${
        article.read ? "opacity-60" : ""
      }`}
    >
      <div className="flex gap-4">
        {article.image ? (
          <img
            src={article.image}
            alt=""
            loading="lazy"
            className="hidden h-28 w-40 shrink-0 rounded-lg object-cover sm:block"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-neutral-500 dark:text-neutral-400">
              {article.sourceName}
            </span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {article.category}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${importanceColor(article.importance)}`}
              title="Importance score"
            >
              {article.importance}
            </span>
            <span className="text-neutral-400 dark:text-neutral-500">
              {formatDate(article.publishedAt)}
            </span>
          </div>
          <a
            href={`/news/${article._id}`}
            className="block text-base font-semibold leading-snug text-neutral-900 hover:underline dark:text-neutral-100"
          >
            {article.title}
          </a>
          {article.excerpt ? (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
              {article.excerpt}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Read original
            </a>
            <button
              onClick={() => onToggleImportant(article)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                article.important
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {article.important ? "★ Important" : "☆ Mark important"}
            </button>
            <button
              onClick={() => onToggleRead(article)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {article.read ? "✓ Read" : "Mark read"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function BriefingView({
  briefing,
  onToggleImportant,
}: {
  briefing: DailyBriefing;
  onToggleImportant: (a: NewsArticle) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          Daily Briefing — {briefing.date}
        </h2>
        <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
          {briefing.summary}
        </p>
      </div>

      <section>
        <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Top stories with key facts for MCQ prep
        </h3>
        {briefing.important.length === 0 ? (
          <EmptyState text="No high-importance articles collected for this day yet." />
        ) : (
          <div className="space-y-3">
            {briefing.important.map((b) => (
              <BriefingCard key={b.article._id} item={b} onToggleImportant={onToggleImportant} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Latest headlines
        </h3>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {briefing.latest.map((b) => (
            <li key={b.article._id} className="py-2 text-sm">
              <a
                href={`/news/${b.article._id}`}
                className="font-medium text-neutral-800 hover:underline dark:text-neutral-200"
              >
                {b.article.title}
              </a>
              <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                {b.article.sourceName} · {formatDate(b.article.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BriefingCard({
  item,
  onToggleImportant,
}: {
  item: BriefingArticle;
  onToggleImportant: (a: NewsArticle) => void;
}) {
  const a = item.article;
  return (
    <article className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-neutral-500 dark:text-neutral-400">
          {a.sourceName} · {a.category}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${importanceColor(a.importance)}`}>
          {a.importance}
        </span>
        <span className="text-neutral-400 dark:text-neutral-500">
          {formatDate(a.publishedAt)}
        </span>
      </div>
      <a
        href={`/news/${a._id}`}
        className="block text-base font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
      >
        {a.title}
      </a>
      {a.excerpt ? (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{a.excerpt}</p>
      ) : null}
      {item.keyFacts.length > 0 && (
        <ul className="mt-2 space-y-1">
          {item.keyFacts.map((fact, i) => (
            <li key={i} className="flex gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="text-emerald-600 dark:text-emerald-400">›</span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Read original
        </a>
        <button
          onClick={() => onToggleImportant(a)}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          ★ Save
        </button>
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
      {text}
    </p>
  );
}
