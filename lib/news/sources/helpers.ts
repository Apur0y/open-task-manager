import { NewsSourceId } from "../types";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 NewsAggregator/1.0";

export async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function fetchOgImage(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const html = await fetchText(url, timeoutMs);
    const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (match?.[1]) return match[1];
    const matchAlt = html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
    return matchAlt?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i], i);
      }
    }
  );
  await Promise.all(workers);
  return results;
}

export function isRelevantSection(url: string): boolean {
  const path = url.replace(/^https?:\/\/[^/]+/, "").toLowerCase();
  return (
    path.startsWith("/business") ||
    path.startsWith("/economy") ||
    path.startsWith("/money") ||
    path.startsWith("/bank") ||
    path.startsWith("/finance") ||
    path.startsWith("/market") ||
    path.startsWith("/bangladesh")
  );
}

export function sourceIdToName(source: NewsSourceId): string {
  return source === "prothomalo" ? "Prothom Alo" : "The Daily Star";
}
