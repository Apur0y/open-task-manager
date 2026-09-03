import StudyTimer from "@/components/study-timer";
import TargetsStats from "@/components/targets-stats";
import { getActiveSession } from "@/lib/study";
import { StudySession } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  let active: StudySession | null = null;
  let dbError: string | undefined;

  try {
    active = await getActiveSession();
  } catch (err) {
    console.error("Failed to load active study session:", err);
    dbError = process.env.MONGODB_URI
      ? "Could not connect to MongoDB. Check that your MONGODB_URI is correct and reachable."
      : "MongoDB is not configured. Add your MONGODB_URI to the .env.local file.";
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <StudyTimer initialActive={active} dbError={dbError} />
      <h1 className="mt-8 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Final Targets
      </h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        All your final targets listed in one place.
      </p>
      <div className="mt-6">
        <TargetsStats />
      </div>
    </main>
  );
}
