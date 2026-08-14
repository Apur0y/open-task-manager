import { NextRequest, NextResponse } from "next/server";
import { runCollector } from "@/lib/news/collect";
import { listNews } from "@/lib/news/store";
import { NEWS_CATEGORIES, NewsCategory, NewsSourceId } from "@/lib/news/types";

const VALID_CATEGORIES = NEWS_CATEGORIES as readonly string[];
const VALID_SOURCES: readonly string[] = ["prothomalo", "dailystar"];

function parseFlag(value: string | null): boolean | undefined {
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const category = sp.get("category") ?? undefined;
    const source = sp.get("source") ?? undefined;
    const q = sp.get("q") ?? undefined;
    const from = sp.get("from") ?? undefined;
    const to = sp.get("to") ?? undefined;

    const result = await listNews({
      category:
        category && VALID_CATEGORIES.includes(category)
          ? (category as NewsCategory)
          : undefined,
      source:
        source && VALID_SOURCES.includes(source)
          ? (source as NewsSourceId)
          : undefined,
      q: q || undefined,
      from,
      to,
      important: parseFlag(sp.get("important")),
      read: parseFlag(sp.get("read")),
      sort: sp.get("sort") === "score" ? "score" : "latest",
      limit: parsePositiveInt(sp.get("limit"), 30),
      skip: parsePositiveInt(sp.get("skip"), 0),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to list news:", err);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let requested: unknown;
    try {
      requested = await request.json();
    } catch {
      requested = {};
    }
    const sourcesRaw =
      requested && typeof requested === "object" && "sources" in requested
        ? (requested as { sources: unknown }).sources
        : undefined;

    const sources = Array.isArray(sourcesRaw)
      ? sourcesRaw.filter((s): s is NewsSourceId =>
          VALID_SOURCES.includes(String(s))
        )
      : undefined;

    const result = await runCollector({ sources });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to run news collector:", err);
    return NextResponse.json(
      { error: "Failed to run news collector" },
      { status: 500 }
    );
  }
}
