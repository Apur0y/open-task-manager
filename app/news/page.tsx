import NewsClient from "@/components/news-client";
import { buildDailyBriefing } from "@/lib/news/briefing";
import { getDailyTop, listNews, todayInDhaka } from "@/lib/news/store";
import { DailyBriefing, NewsArticle, NewsCategory } from "@/lib/news/types";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const today = todayInDhaka();
  let articles: NewsArticle[] = [];
  let total = 0;
  let categories: { name: NewsCategory; count: number }[] = [];
  let todayImportant: NewsArticle[] = [];
  let briefing: DailyBriefing | null = null;
  let dbError: string | undefined;

  try {
    const [latest, top, b] = await Promise.all([
      listNews({ sort: "latest", limit: 40 }),
      getDailyTop(today, 8),
      buildDailyBriefing(today),
    ]);
    articles = latest.articles;
    total = latest.total;
    categories = latest.categories;
    todayImportant = top;
    briefing = b;
  } catch (err) {
    console.error("Failed to load news:", err);
    dbError = process.env.MONGODB_URI
      ? "Could not connect to MongoDB. Check that your MONGODB_URI is correct and reachable."
      : "MongoDB is not configured. Add your MONGODB_URI to the .env.local file.";
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Bank-Job Current Affairs
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Aggregated from Prothom Alo and The Daily Star for Bangladesh bank
          examinations. News is collected automatically.
        </p>
      </div>
      <NewsClient
        initialArticles={articles}
        initialTotal={total}
        initialCategories={categories}
        todayImportant={todayImportant}
        initialBriefing={briefing}
        dbError={dbError}
      />
    </main>
  );
}
