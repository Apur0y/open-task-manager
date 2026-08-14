import { runCollector } from "./collect";

declare global {
  var __newsCronStarted: boolean | undefined;
}

function parseMinutes(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function startNewsCron(): void {
  if (globalThis.__newsCronStarted) return;
  globalThis.__newsCronStarted = true;

  const minutes = parseMinutes(process.env.NEWS_CRON_MINUTES, 60);
  const run = () => {
    runCollector()
      .then((result) => {
        console.log(
          `[news] Scheduled collection done: ${result.totalInserted} new / ${result.totalFetched} fetched in ${result.sources.length} source(s)`
        );
      })
      .catch((err) => console.error("[news] Scheduled collection failed:", err));
  };

  setTimeout(run, 20_000);
  setInterval(run, minutes * 60_000);
  console.log(`[news] Collector scheduled to run every ${minutes} minute(s).`);
}
