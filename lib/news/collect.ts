import { CollectResult, CollectSourceResult, NewsSourceId } from "./types";
import { saveRawArticles } from "./store";
import { getSourceModules } from "./sources";

export interface CollectOptions {
  sources?: NewsSourceId[];
}

export async function runCollector(options: CollectOptions = {}): Promise<CollectResult> {
  const startedAt = new Date();
  const modules = getSourceModules(options.sources);
  const results: CollectSourceResult[] = [];

  await Promise.all(
    modules.map(async (module) => {
      const base: CollectSourceResult = {
        source: module.id,
        sourceName: module.name,
        fetched: 0,
        inserted: 0,
        skipped: 0,
      };
      try {
        const rawArticles = await module.fetch();
        base.fetched = rawArticles.length;
        const saved = await saveRawArticles(rawArticles);
        base.inserted = saved.inserted;
        base.skipped = saved.skipped;
      } catch (err) {
        console.error(`[news] Source "${module.name}" failed:`, err);
        base.error = err instanceof Error ? err.message : String(err);
      }
      results.push(base);
    })
  );

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    sources: results,
    totalFetched: results.reduce((sum, r) => sum + r.fetched, 0),
    totalInserted: results.reduce((sum, r) => sum + r.inserted, 0),
  };
}
