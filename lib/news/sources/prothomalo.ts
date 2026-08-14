import Parser from "rss-parser";
import { RawArticle } from "../types";
import { NewsSourceModule } from "./types";
import {
  fetchText,
  isRelevantSection,
  parseDate,
  sourceIdToName,
  USER_AGENT,
} from "./helpers";
import { extractText, matchScore, stripHtml } from "../categorize";

const FEED_URL = "https://www.prothomalo.com/feed";
const MAX_ARTICLES = 60;

interface PaFeedItem {
  title?: string | unknown;
  link?: string;
  guid?: string;
  pubDate?: string;
  description?: string;
  contentSnippet?: string;
  content?: string;
  categories?: string[];
  mediaThumbnail?: { url?: string };
  mediaContent?: { url?: string };
  mediaKeywords?: string | unknown;
}

export const prothomalo: NewsSourceModule = {
  id: "prothomalo",
  name: "Prothom Alo",
  description: "Business, economy, Bangladesh and banking news from Prothom Alo (RSS).",

  async fetch(): Promise<RawArticle[]> {
    const xml = await fetchText(FEED_URL, 20000);
    const parser = new Parser<unknown, PaFeedItem>({
      headers: { "User-Agent": USER_AGENT },
      customFields: {
        item: [
          ["media:thumbnail", "mediaThumbnail"],
          ["media:content", "mediaContent"],
          ["media:keywords", "mediaKeywords"],
        ],
      },
    });
    const feed = await parser.parseString(xml);
    if (!feed.items?.length) return [];

    const articles: RawArticle[] = [];

    for (const item of feed.items.slice(0, MAX_ARTICLES)) {
      try {
        const title = extractText(item.title).trim();
        const url = (item.link || "").trim();
        if (!title || !url) continue;

        const categoryField = extractText(item.categories?.[0]).trim();
        const keywords = extractText(item.mediaKeywords)
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean);

        const text = `${title} ${item.description ?? ""} ${categoryField} ${keywords.join(" ")}`;
        const relevant =
          isRelevantSection(url) ||
          matchScore(text).category !== "General" ||
          ["ব্যাংক", "অর্থনীতি", "বাণিজ্য", "বাংলাদেশ", "ব্যবসা"].includes(categoryField);

        if (!relevant) continue;

        const published = parseDate(item.pubDate);
        const imageUrl = item.mediaContent?.url ?? item.mediaThumbnail?.url ?? null;
        const content = stripHtml(item.content).slice(0, 6000) || null;
        const excerpt =
          stripHtml(item.description).slice(0, 400) || stripHtml(item.contentSnippet).slice(0, 400);

        articles.push({
          title,
          source: "prothomalo",
          sourceName: sourceIdToName("prothomalo"),
          url,
          sourceKey: (item.guid || url).trim(),
          excerpt,
          content,
          image: imageUrl,
          publishedAt: published,
        });
      } catch {
        // Skip malformed items; the source keeps running.
      }
    }

    return articles;
  },
};
