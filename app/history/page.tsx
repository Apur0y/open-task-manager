import { Suspense } from "react";
import HistoryClient from "@/components/history-client";
import { getPreferredTimezone, todayInTz } from "@/lib/study";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Study History",
};

interface HistoryPageProps {
  searchParams: Promise<{ date?: string; compare?: string }>;
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  await searchParams;
  let fallbackDate = todayInTz("UTC");
  try {
    fallbackDate = todayInTz(await getPreferredTimezone());
  } catch (err) {
    console.error("Failed to resolve preferred timezone:", err);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Study History
        </h1>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          Times shown in your study timezone
        </span>
      </div>
      <Suspense
        fallback={
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Loading…
          </p>
        }
      >
        <HistoryClient fallbackDate={fallbackDate} />
      </Suspense>
    </main>
  );
}
