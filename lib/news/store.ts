import { Collection, MongoBulkWriteError, ObjectId } from "mongodb";
import { createHash } from "node:crypto";
import { getDb } from "../mongodb";
import { matchScore, scoreImportance } from "./categorize";
import {
  NewsArticle,
  NewsCategory,
  NewsFilters,
  NewsQueryResult,
  RawArticle,
} from "./types";

export interface MongoNewsArticle {
  _id: ObjectId;
  title: string;
  source: string;
  sourceName: string;
  url: string;
  urlHash: string;
  sourceKey: string;
  contentHash: string;
  excerpt: string;
  content: string | null;
  image: string | null;
  category: NewsCategory;
  publishedAt: Date;
  publishedDate: string;
  collectedAt: Date;
  importance: number;
  read: boolean;
  important: boolean;
  keywords: string[];
}

function hash(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

function normalizeUrl(url: string): string {
  return url
    .split("?")[0]
    .split("#")[0]
    .replace(/\/+$/, "")
    .toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toNewsArticle(doc: MongoNewsArticle): NewsArticle {
  return {
    _id: doc._id.toHexString(),
    title: doc.title,
    source: doc.source as NewsArticle["source"],
    sourceName: doc.sourceName,
    url: doc.url,
    urlHash: doc.urlHash,
    sourceKey: doc.sourceKey,
    contentHash: doc.contentHash,
    excerpt: doc.excerpt,
    content: doc.content,
    image: doc.image,
    category: doc.category,
    publishedAt: doc.publishedAt.toISOString(),
    publishedDate: doc.publishedDate,
    collectedAt: doc.collectedAt.toISOString(),
    importance: doc.importance,
    read: doc.read,
    important: doc.important,
    keywords: doc.keywords,
  };
}

export function dhakaDateString(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayInDhaka(): string {
  return dhakaDateString(new Date());
}

function publishedDateString(d: Date): string {
  return dhakaDateString(d);
}

export async function getNewsCollection(): Promise<Collection<MongoNewsArticle>> {
  const db = await getDb();
  const col = db.collection<MongoNewsArticle>("news");
  await Promise.all([
    col.createIndex({ urlHash: 1 }, { unique: true }),
    col.createIndex({ source: 1, sourceKey: 1 }, { unique: true }),
    col.createIndex({ publishedAt: -1 }),
    col.createIndex({ category: 1, publishedAt: -1 }),
    col.createIndex({ importance: -1, publishedAt: -1 }),
  ]);
  return col;
}

export interface SaveSummary {
  inserted: number;
  skipped: number;
  duplicate: number;
}

export async function saveRawArticles(raws: RawArticle[]): Promise<SaveSummary> {
  if (!raws.length) return { inserted: 0, skipped: 0, duplicate: 0 };
  const col = await getNewsCollection();
  const now = new Date();

  const seenUrl = new Set<string>();
  const seenKey = new Set<string>();
  const unique = raws.filter((raw) => {
    const urlHash = hash(normalizeUrl(raw.url));
    const key = `${raw.source}:${raw.sourceKey}`;
    if (seenUrl.has(urlHash) || seenKey.has(key)) return false;
    seenUrl.add(urlHash);
    seenKey.add(key);
    return true;
  });

  const ops = unique.map((raw) => {
    const publishedAt = raw.publishedAt ?? now;
    const classified = matchScore(`${raw.title} ${raw.excerpt} ${raw.content ?? ""}`);
    const importance = scoreImportance(raw, classified.category, classified.matched);
    const urlHash = hash(normalizeUrl(raw.url));
    const contentHash = hash(
      `${raw.source}:${raw.title.toLowerCase().replace(/\s+/g, " ")}`
    );
    const doc: MongoNewsArticle = {
      _id: new ObjectId(),
      title: raw.title,
      source: raw.source,
      sourceName: raw.sourceName,
      url: raw.url,
      urlHash,
      sourceKey: raw.sourceKey,
      contentHash,
      excerpt: raw.excerpt,
      content: raw.content,
      image: raw.image,
      category: classified.category,
      publishedAt,
      publishedDate: publishedDateString(publishedAt),
      collectedAt: now,
      importance,
      read: false,
      important: false,
      keywords: classified.matched,
    };
    return {
      updateOne: {
        filter: {
          $or: [{ urlHash }, { source: raw.source, sourceKey: raw.sourceKey }],
        },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    };
  });

  const inBatchDuplicates = raws.length - unique.length;

  try {
    const result = await col.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount;

    const refreshOps = unique.map((raw) => {
      const classified = matchScore(`${raw.title} ${raw.excerpt} ${raw.content ?? ""}`);
      const importance = scoreImportance(raw, classified.category, classified.matched);
      const urlHash = hash(normalizeUrl(raw.url));
      return {
        updateOne: {
          filter: {
            $or: [{ urlHash }, { source: raw.source, sourceKey: raw.sourceKey }],
            read: false,
            important: false,
          },
          update: {
            $set: {
              category: classified.category,
              importance,
              keywords: classified.matched,
            },
          },
          upsert: false,
        },
      };
    });
    if (refreshOps.length) {
      await col.bulkWrite(refreshOps, { ordered: false });
    }

    return {
      inserted,
      skipped: unique.length - inserted,
      duplicate: inBatchDuplicates,
    };
  } catch (err) {
    const bulk = err as MongoBulkWriteError;
    const inserted = bulk?.upsertedCount ?? 0;
    const writeErrors = Array.isArray(bulk?.writeErrors) ? bulk.writeErrors.length : 0;
    return {
      inserted,
      skipped: unique.length - inserted - writeErrors,
      duplicate: inBatchDuplicates + writeErrors,
    };
  }
}

export async function listNews(filters: NewsFilters): Promise<NewsQueryResult> {
  const col = await getNewsCollection();
  const query: Record<string, unknown> = {};

  if (filters.category && filters.category !== "General") {
    query.category = filters.category;
  }
  if (filters.source) {
    query.source = filters.source;
  }
  if (filters.important) {
    query.important = true;
  }
  if (filters.read !== undefined) {
    query.read = filters.read;
  }
  if (filters.from || filters.to) {
    const range: Record<string, string> = {};
    if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
      range.$gte = filters.from;
    }
    if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
      range.$lte = filters.to;
    }
    if (Object.keys(range).length) query.publishedDate = range;
  }
  if (filters.q) {
    const escaped = escapeRegex(filters.q);
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { excerpt: { $regex: escaped, $options: "i" } },
      { keywords: { $regex: escaped, $options: "i" } },
    ];
  }

  const sort: Record<string, 1 | -1> =
    filters.sort === "score"
      ? { importance: -1, publishedAt: -1 }
      : { publishedAt: -1, importance: -1 };

  const limit = Math.min(100, filters.limit ?? 30);
  const skip = filters.skip ?? 0;

  const [docs, total, categoryCounts] = await Promise.all([
    col.find(query).sort(sort).skip(skip).limit(limit).toArray(),
    col.countDocuments(query),
    col.aggregate<{ _id: NewsCategory; count: number }>([
      { $match: query },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
  ]);

  return {
    articles: docs.map(toNewsArticle),
    total,
    categories: categoryCounts.map((c) => ({ name: c._id, count: c.count })),
  };
}

export async function getNewsById(id: string): Promise<NewsArticle | null> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  const col = await getNewsCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? toNewsArticle(doc) : null;
}

export async function updateNewsFlags(
  id: string,
  updates: { read?: boolean; important?: boolean }
): Promise<NewsArticle | null> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return null;
  const col = await getNewsCollection();
  const set: Partial<MongoNewsArticle> = {};
  if (updates.read !== undefined) set.read = updates.read;
  if (updates.important !== undefined) set.important = updates.important;
  if (!Object.keys(set).length) return null;
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: set },
    { returnDocument: "after" }
  );
  return doc ? toNewsArticle(doc) : null;
}

export async function deleteNews(id: string): Promise<boolean> {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return false;
  const col = await getNewsCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount === 1;
}

export async function getDailyTop(
  dateString: string,
  limit: number,
  threshold = 55
): Promise<NewsArticle[]> {
  const col = await getNewsCollection();
  const docs = await col
    .find({ publishedDate: dateString, importance: { $gte: threshold } })
    .sort({ importance: -1, publishedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toNewsArticle);
}

export async function countPublishedOn(dateString: string): Promise<number> {
  const col = await getNewsCollection();
  return col.countDocuments({ publishedDate: dateString });
}

export async function getLatestNews(limit: number): Promise<NewsArticle[]> {
  const col = await getNewsCollection();
  const docs = await col
    .find({})
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toNewsArticle);
}

export async function getImportantNews(limit: number): Promise<NewsArticle[]> {
  const col = await getNewsCollection();
  const docs = await col
    .find({ important: true })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toNewsArticle);
}
