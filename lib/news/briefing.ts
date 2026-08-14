import { extractKeyFacts } from "./categorize";
import { countPublishedOn, getDailyTop, getLatestNews, todayInDhaka } from "./store";
import { BriefingArticle, DailyBriefing } from "./types";

const TOP_LIMIT = 8;

export async function buildDailyBriefing(
  date = todayInDhaka()
): Promise<DailyBriefing> {
  const [important, latest, totalToday] = await Promise.all([
    getDailyTop(date, TOP_LIMIT),
    getLatestNews(5),
    countPublishedOn(date),
  ]);

  const toBriefing = (article: BriefingArticle["article"]): BriefingArticle => ({
    article,
    keyFacts: extractKeyFacts(article.content ?? article.excerpt, 3),
  });

  const importantBriefing = important.map(toBriefing);
  const latestBriefing = latest.map(toBriefing);

  return {
    date,
    summary:
      totalToday === 0
        ? `No articles collected for ${date} yet. Run the collector or wait for the next scheduled run.`
        : `${totalToday} article${totalToday === 1 ? "" : "s"} published on ${date}; ${important.length} flagged as important for bank-job preparation.`,
    totalToday,
    important: importantBriefing,
    latest: latestBriefing,
  };
}
