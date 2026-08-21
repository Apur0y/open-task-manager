import { Suspense } from "react";
import HistoryClient from "@/components/history-client";
import { getPreferredTimezone, todayInTz } from "@/lib/study";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "History",
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
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">
      <Suspense
        fallback={
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Loading…
          </p>
        }
      >
        <HistoryClient fallbackDate={fallbackDate} />
      </Suspense>
    </main>
  );
}
