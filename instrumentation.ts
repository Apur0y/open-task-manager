export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNewsCron } = await import("./lib/news/cron");
    startNewsCron();
  }
}
