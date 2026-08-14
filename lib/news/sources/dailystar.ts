import Parser from "rss-parser";
import { RawArticle } from "../types";
import { NewsSourceModule } from "./types";
import {
  fetchOgImage,
  fetchText,
  mapWithConcurrency,
  parseDate,
  sourceIdToName,
  USER_AGENT,
} from "./helpers";
import { extractText, stripHtml } from "../categorize";

const FEEDS: { url: string; hint: string }[] = [
  { url: "https://www.thedailystar.net/business/rss.xml", hint: "business" },
  { url: "https://www.thedailystar.net/business/banking/rss.xml", hint: "banking" },
  { url: "https://www.thedailystar.net/business/economy/rss.xml", hint: "economy" },
  { url: "https://www.thedailystar.net/bangladesh/rss.xml", hint: "bangladesh" },
];

interface DsFeedItem {
  title?: string | unknown;
  link?: string;
  guid?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
}

export const dailystar: NewsSourceModule = {
  id: "dailystar",
  name: "The Daily Star",
  description: "Business, banking, economy and Bangladesh news from The Daily Star (RSS).",

  async fetch(): Promise<RawArticle[]> {
    const parser = new Parser<unknown, DsFeedItem>({
      headers: { "User-Agent": USER_AGENT },
    });
    const seen = new Set<string>();
    const articles: RawArticle[] = [];

    for (const feed of FEEDS) {
      try {
        const xml = await fetchText(feed.url, 20000);
        const parsed = await parser.parseString(xml);
        if (!parsed.items?.length) continue;

        for (const item of parsed.items) {
          try {
            const title = stripHtml(extractText(item.title)).trim();
            const url = (item.link || "").trim();
            if (!title || !url) continue;

            const key = url.replace(/[?&].*$/, "");
            if (seen.has(key)) continue;
            seen.add(key);

            articles.push({
              title,
              source: "dailystar",
              sourceName: sourceIdToName("dailystar"),
              url,
              sourceKey: (item.guid || url).trim(),
              excerpt: stripHtml(item.contentSnippet || item.content).slice(0, 400),
              content: null,
              image: null,
              publishedAt: parseDate(item.pubDate),
            });
          } catch {
            // Skip malformed items; the source keeps running.
          }
        }
      } catch {
        // One section failing should not stop the other sections.
      }
    }

    await mapWithConcurrency(articles, 3, async (article) => {
      article.image = await fetchOgImage(article.url, 8000);
    });

    return articles;
  },
};
